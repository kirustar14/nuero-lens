"""
Polygenic Risk Score (PRS) Calculator
Main analysis engine for calculating psychiatric risk scores.
"""
import pandas as pd
import numpy as np
from typing import Dict, Optional, Tuple
import logging
from pathlib import Path
import time

from .allele_harmonization import AlleleHarmonizer

logger = logging.getLogger(__name__)


class PRSCalculator:
    """
    Calculate Polygenic Risk Scores from VCF and GWAS data.
    
    Based on Grotzinger et al. (2022) methodology for psychiatric genetics.
    """
    
    def __init__(self, drop_ambiguous: bool = True):
        """
        Args:
            drop_ambiguous: Drop strand-ambiguous SNPs (AT/CG pairs)
        """
        self.drop_ambiguous = drop_ambiguous
        self.harmonizer = AlleleHarmonizer(drop_ambiguous=drop_ambiguous)
    
    def calculate_disorder_prs(
        self,
        gwas_path: str,
        patient_df: pd.DataFrame,
        disorder_name: str,
        verbose: bool = False
    ) -> Tuple[float, int, str]:
        """
        Calculate PRS for a single disorder.
        
        Args:
            gwas_path: Path to GWAS summary statistics file
            patient_df: DataFrame from VCF parser (snpid, ref, alt, alt_dosage)
            disorder_name: Name of disorder (for logging)
            verbose: Enable detailed logging
            
        Returns:
            Tuple of (prs_score, snp_count, status)
            - prs_score: Polygenic risk score (sum of weighted dosages)
            - snp_count: Number of SNPs used in calculation
            - status: "ok", "error", or error description
        """
        start_time = time.time()
        
        if verbose:
            logger.info(f"Analyzing {disorder_name}...")
        
        # Validate inputs
        if not Path(gwas_path).exists():
            logger.warning(f"GWAS file not found: {gwas_path}")
            return 0.0, 0, "file_not_found"
        
        if patient_df.empty:
            logger.warning("Patient VCF data is empty")
            return 0.0, 0, "empty_vcf"
        
        # Prepare patient data
        patient_df = patient_df.copy()
        patient_df["snpid"] = patient_df["snpid"].astype(str).str.strip()
        patient_snps = set(patient_df["snpid"])
        
        # Column mapping for different GWAS formats
        col_map = {
            "rsid": "snpid", "snp": "snpid", "markername": "snpid", 
            "id": "snpid", "variant": "snpid",
            
            "a1": "ea", "effect_allele": "ea", "ea": "ea", 
            "alt": "ea", "allele1": "ea", "tested_allele": "ea",
            
            "a2": "nea", "other_allele": "nea", "nea": "nea", 
            "ref": "nea", "allele2": "nea", "non_effect_allele": "nea",
            
            "beta": "beta", "weight": "beta", "effect_weight": "beta", 
            "effect": "beta", "b": "beta",
            
            "or": "or", "odds_ratio": "or",
            
            "p": "p", "pval": "p", "p-value": "p", "p_value": "p"
        }
        
        matched_chunks = []
        
        try:
            # Read GWAS file in chunks for memory efficiency
            chunks = pd.read_csv(
                gwas_path,
                sep=r"\s+",
                engine="python",
                comment="#",
                chunksize=200000,
                on_bad_lines='skip'
            )
            
            for chunk in chunks:
                # Normalize column names
                chunk.columns = chunk.columns.str.lower().str.strip()
                chunk = chunk.rename(columns=col_map)
                
                # Check for required columns
                if not all(col in chunk.columns for col in ["snpid", "ea", "nea"]):
                    if verbose:
                        logger.debug(f"Chunk missing required columns, skipping")
                    continue
                
                # Pre-filter: only keep SNPs present in patient VCF
                chunk["snpid"] = chunk["snpid"].astype(str).str.strip()
                chunk = chunk[chunk["snpid"].isin(patient_snps)]
                
                if not chunk.empty:
                    matched_chunks.append(chunk)
        
        except Exception as e:
            logger.error(f"Error reading GWAS file {disorder_name}: {e}")
            return 0.0, 0, f"read_error: {type(e).__name__}"
        
        # Check if we found any matches
        if not matched_chunks:
            if verbose:
                logger.warning(f"{disorder_name}: No SNP overlaps found")
            return 0.0, 0, "no_overlap"
        
        # Combine matched chunks
        gwas = pd.concat(matched_chunks, ignore_index=True)
        gwas = gwas.drop_duplicates(subset=["snpid"])
        
        # Merge with patient data
        merged = patient_df.merge(gwas, on="snpid", how="inner")
        
        if verbose:
            logger.info(f"  {disorder_name}: Merged {len(merged)} SNPs")
        
        if merged.empty:
            return 0.0, 0, "no_overlap"
        
        # ====================================================================
        # Extract weights (beta or log(OR))
        # ====================================================================
        
        if "beta" in merged.columns:
            merged["weight"] = pd.to_numeric(merged["beta"], errors="coerce")
        elif "or" in merged.columns:
            or_values = pd.to_numeric(merged["or"], errors="coerce")
            # Convert OR to log(OR) for additive effect
            merged["weight"] = np.log(or_values)
        else:
            if verbose:
                logger.warning(f"{disorder_name}: No beta or OR column found")
            return 0.0, 0, "no_weights"
        
        # ====================================================================
        # Harmonize alleles
        # ====================================================================
        
        self.harmonizer.reset_stats()
        effect_dosages, harmonization_stats = self.harmonizer.harmonize_batch(merged)
        merged["ea_dosage"] = effect_dosages
        
        # Drop SNPs that couldn't be harmonized
        merged = merged.dropna(subset=["ea_dosage", "weight"])
        
        if verbose:
            logger.info(f"  {disorder_name}: After harmonization: {len(merged)} SNPs")
            logger.debug(f"  Harmonization stats: {harmonization_stats}")
        
        if len(merged) == 0:
            return 0.0, 0, "no_match_after_harmonization"
        
        # ====================================================================
        # Calculate PRS
        # ====================================================================
        
        # PRS = sum(effect_allele_dosage * weight)
        prs_score = float((merged["ea_dosage"] * merged["weight"]).sum())
        snp_count = len(merged)
        
        elapsed = time.time() - start_time
        
        if verbose:
            logger.info(f"  {disorder_name}: PRS = {prs_score:.6f} "
                       f"({snp_count} SNPs, {elapsed:.2f}s)")
        
        return prs_score, snp_count, "ok"
    
    def calculate_all_disorders(
        self,
        gwas_files: Dict[str, str],
        patient_df: pd.DataFrame,
        verbose: bool = False
    ) -> Dict[str, Dict]:
        """
        Calculate PRS for all disorders.
        
        Args:
            gwas_files: Dict mapping disorder name to GWAS file path
            patient_df: Patient VCF data
            verbose: Enable detailed logging
            
        Returns:
            Dict with disorder results:
            {
                "MDD": {"score": 0.123, "snp_count": 456, "status": "ok"},
                ...
            }
        """
        results = {}
        
        for disorder, gwas_path in gwas_files.items():
            score, snp_count, status = self.calculate_disorder_prs(
                gwas_path=gwas_path,
                patient_df=patient_df,
                disorder_name=disorder,
                verbose=verbose
            )
            
            results[disorder] = {
                "score": score,
                "snp_count": snp_count,
                "status": status
            }
        
        return results
    
    def calculate_factor_scores(
        self,
        disorder_scores: Dict[str, float],
        loadings_path: str
    ) -> Optional[Dict[str, float]]:
        """
        Calculate broad psychiatric factor scores using genomic SEM loadings.
        
        Based on Grotzinger et al. (2022) 5-factor model.
        
        Args:
            disorder_scores: Dict of disorder -> PRS score
            loadings_path: Path to factor loadings CSV file
            
        Returns:
            Dict of factor -> score, or None if loadings unavailable
        """
        if not Path(loadings_path).exists():
            logger.warning(f"Loadings file not found: {loadings_path}")
            return None
        
        try:
            # Load factor loadings (disorders x factors)
            loadings = pd.read_csv(loadings_path, index_col=0)
            
            # Create score vector aligned with loadings columns
            score_vector = pd.Series(disorder_scores).reindex(loadings.columns).fillna(0.0)
            
            # Matrix multiply: factors = loadings @ scores
            factor_values = loadings.values @ score_vector.values
            factor_scores = dict(zip(loadings.index, factor_values))
            
            logger.info(f"Calculated {len(factor_scores)} factor scores")
            return factor_scores
        
        except Exception as e:
            logger.error(f"Error calculating factor scores: {e}")
            return None


# Singleton instance
prs_calculator = PRSCalculator()
