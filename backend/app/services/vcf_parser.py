"""
VCF Parser Service - CLEANED VERSION
Extracts SNP data from VCF files efficiently.
"""
import pandas as pd
from typing import Dict, Tuple, Optional
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class VCFParser:
    """Parse VCF files and extract genotype information"""
    
    def __init__(self):
        self.valid_bases = set("ACGT")
    
    def parse_vcf(self, vcf_path: str) -> pd.DataFrame:
        """
        Parse VCF file and extract SNP information.
        
        Args:
            vcf_path: Path to VCF file
            
        Returns:
            DataFrame with columns: snpid, ref, alt, alt_dosage
            
        Raises:
            FileNotFoundError: If VCF file doesn't exist
            ValueError: If VCF format is invalid
        """
        if not Path(vcf_path).exists():
            raise FileNotFoundError(f"VCF file not found: {vcf_path}")
        
        logger.info(f"Parsing VCF: {vcf_path}")
        
        rows = []
        line_count = 0
        skipped = 0
        
        try:
            with open(vcf_path, "r") as f:
                for line in f:
                    line_count += 1
                    
                    # Skip header lines
                    if line.startswith("#"):
                        continue
                    
                    fields = line.rstrip("\n").split("\t")
                    
                    # VCF should have at least 10 columns
                    if len(fields) < 10:
                        skipped += 1
                        continue
                    
                    try:
                        rsid = fields[2].strip()
                        ref = fields[3].strip().upper()
                        alt = fields[4].strip().upper()
                        
                        # Skip if missing rsID
                        if rsid == ".":
                            skipped += 1
                            continue
                        
                        # Skip multiallelic sites
                        if "," in alt:
                            skipped += 1
                            continue
                        
                        # Validate alleles
                        if not self._valid_allele(ref) or not self._valid_allele(alt):
                            skipped += 1
                            continue
                        
                        # Parse genotype (GT field)
                        gt_field = fields[9].split(":")[0]
                        alt_dosage = self._parse_genotype(gt_field)
                        
                        if alt_dosage is None:
                            skipped += 1
                            continue
                        
                        rows.append({
                            "snpid": rsid,
                            "ref": ref,
                            "alt": alt,
                            "alt_dosage": alt_dosage
                        })
                    
                    except Exception as e:
                        logger.debug(f"Skipped line {line_count}: {e}")
                        skipped += 1
                        continue
            
            df = pd.DataFrame(rows)
            
            if df.empty:
                raise ValueError("No valid variants found in VCF file")
            
            # Ensure snpid is string and clean
            df["snpid"] = df["snpid"].astype(str).str.strip()
            
            logger.info(f"Successfully parsed {len(df):,} variants (skipped {skipped:,})")
            
            return df
        
        except Exception as e:
            logger.error(f"Error parsing VCF: {e}")
            raise
    
    def _valid_allele(self, allele: str) -> bool:
        """Check if allele contains only valid bases"""
        return len(allele) > 0 and all(base in self.valid_bases for base in allele)
    
    def _parse_genotype(self, gt: str) -> Optional[int]:
        """
        Parse genotype field to alt allele dosage.
        
        Returns:
            0 for homozygous ref (0/0, 0|0)
            1 for heterozygous (0/1, 1/0, 0|1, 1|0)
            2 for homozygous alt (1/1, 1|1)
            None for invalid/missing genotypes
        """
        if gt in ("0/0", "0|0"):
            return 0
        elif gt in ("0/1", "1/0", "0|1", "1|0"):
            return 1
        elif gt in ("1/1", "1|1"):
            return 2
        else:
            return None
    
    def get_vcf_stats(self, vcf_path: str) -> Dict:
        """
        Get basic statistics about a VCF file without full parsing.
        
        Returns:
            Dict with: variant_count, sample_count, chromosomes
        """
        variant_count = 0
        sample_count = 0
        chromosomes = set()
        
        try:
            with open(vcf_path, "r") as f:
                for line in f:
                    if line.startswith("##"):
                        continue
                    elif line.startswith("#CHROM"):
                        # Count samples (columns after FORMAT)
                        fields = line.strip().split("\t")
                        sample_count = len(fields) - 9
                    else:
                        variant_count += 1
                        chrom = line.split("\t")[0]
                        chromosomes.add(chrom)
            
            return {
                "variant_count": variant_count,
                "sample_count": sample_count,
                "chromosomes": sorted(list(chromosomes), key=lambda x: (x.isdigit(), x))
            }
        
        except Exception as e:
            logger.error(f"Error getting VCF stats: {e}")
            return {
                "variant_count": 0,
                "sample_count": 0,
                "chromosomes": []
            }


# Singleton instance
vcf_parser = VCFParser()
