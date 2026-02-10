"""
Allele Harmonization Utilities
Handles strand flipping and allele matching between VCF and GWAS data.
"""
from typing import Tuple, Literal
import logging

logger = logging.getLogger(__name__)

# DNA complement mapping
_COMPLEMENT_MAP = {
    "A": "T",
    "T": "A",
    "C": "G",
    "G": "C"
}


def complement(allele: str) -> str:
    """
    Return complement of DNA sequence.
    
    Args:
        allele: DNA sequence (e.g., "A", "AT", "CGT")
        
    Returns:
        Complement sequence (e.g., "T", "TA", "GCA")
    """
    return "".join(_COMPLEMENT_MAP.get(base, "N") for base in allele)


def is_ambiguous(allele1: str, allele2: str) -> bool:
    """
    Check if SNP is strand-ambiguous (AT or CG pair).
    
    These SNPs cannot be reliably harmonized without additional info
    because they look identical on both strands.
    
    Args:
        allele1: First allele
        allele2: Second allele
        
    Returns:
        True if ambiguous, False otherwise
    """
    pair = {allele1.upper(), allele2.upper()}
    return pair == {"A", "T"} or pair == {"C", "G"}


def harmonize_alleles(
    vcf_ref: str,
    vcf_alt: str,
    vcf_alt_dosage: int,
    gwas_ea: str,
    gwas_nea: str,
    drop_ambiguous: bool = True
) -> Tuple[float, str]:
    """
    Harmonize alleles between VCF and GWAS data.
    
    This is the core function that determines:
    1. If VCF and GWAS alleles match (with strand flipping)
    2. How to convert VCF dosage to effect allele dosage
    
    Args:
        vcf_ref: Reference allele from VCF
        vcf_alt: Alternative allele from VCF
        vcf_alt_dosage: Dosage of alt allele (0, 1, or 2)
        gwas_ea: Effect allele from GWAS
        gwas_nea: Non-effect allele from GWAS
        drop_ambiguous: Whether to drop strand-ambiguous SNPs
        
    Returns:
        Tuple of (effect_allele_dosage, status)
        - effect_allele_dosage: Dosage of GWAS effect allele (0-2, or NaN)
        - status: One of:
            - "ea_is_alt": Effect allele matches VCF alt
            - "ea_is_ref": Effect allele matches VCF ref
            - "ea_is_alt_flip": Effect allele matches complement of VCF alt
            - "ea_is_ref_flip": Effect allele matches complement of VCF ref
            - "ambiguous_ref_alt": VCF alleles are strand-ambiguous
            - "ambiguous_after_flip": Complement is strand-ambiguous
            - "no_match": Alleles don't match
    """
    # Normalize to uppercase
    vcf_ref = vcf_ref.upper()
    vcf_alt = vcf_alt.upper()
    gwas_ea = gwas_ea.upper()
    gwas_nea = gwas_nea.upper()
    
    # Check if VCF alleles are ambiguous
    if drop_ambiguous and is_ambiguous(vcf_ref, vcf_alt):
        return (float('nan'), "ambiguous_ref_alt")
    
    # ========================================================================
    # STRATEGY 1: Direct alignment (forward strand)
    # ========================================================================
    
    if gwas_ea == vcf_alt and gwas_nea == vcf_ref:
        # Effect allele is the VCF alt allele
        return (float(vcf_alt_dosage), "ea_is_alt")
    
    if gwas_ea == vcf_ref and gwas_nea == vcf_alt:
        # Effect allele is the VCF ref allele
        # Need to flip dosage: 0→2, 1→1, 2→0
        return (float(2 - vcf_alt_dosage), "ea_is_ref")
    
    # ========================================================================
    # STRATEGY 2: Strand flip (reverse complement)
    # ========================================================================
    
    vcf_ref_comp = complement(vcf_ref)
    vcf_alt_comp = complement(vcf_alt)
    
    # Check if complements are ambiguous
    if drop_ambiguous and is_ambiguous(vcf_ref_comp, vcf_alt_comp):
        return (float('nan'), "ambiguous_after_flip")
    
    if gwas_ea == vcf_alt_comp and gwas_nea == vcf_ref_comp:
        # Effect allele is complement of VCF alt
        return (float(vcf_alt_dosage), "ea_is_alt_flip")
    
    if gwas_ea == vcf_ref_comp and gwas_nea == vcf_alt_comp:
        # Effect allele is complement of VCF ref
        return (float(2 - vcf_alt_dosage), "ea_is_ref_flip")
    
    # ========================================================================
    # No match found
    # ========================================================================
    
    return (float('nan'), "no_match")


class AlleleHarmonizer:
    """
    Batch allele harmonization for DataFrames.
    """
    
    def __init__(self, drop_ambiguous: bool = True):
        self.drop_ambiguous = drop_ambiguous
        self.stats = {
            "ea_is_alt": 0,
            "ea_is_ref": 0,
            "ea_is_alt_flip": 0,
            "ea_is_ref_flip": 0,
            "ambiguous_ref_alt": 0,
            "ambiguous_after_flip": 0,
            "no_match": 0
        }
    
    def harmonize_batch(self, merged_df) -> Tuple[list, dict]:
        """
        Harmonize a batch of SNPs from merged VCF+GWAS data.
        
        Args:
            merged_df: DataFrame with columns:
                - ref (VCF ref allele)
                - alt (VCF alt allele)
                - alt_dosage (VCF alt dosage)
                - ea (GWAS effect allele)
                - nea (GWAS non-effect allele)
        
        Returns:
            Tuple of (effect_dosages, stats)
            - effect_dosages: List of effect allele dosages
            - stats: Dict of harmonization status counts
        """
        effect_dosages = []
        
        for row in merged_df.itertuples(index=False):
            dosage, status = harmonize_alleles(
                vcf_ref=row.ref,
                vcf_alt=row.alt,
                vcf_alt_dosage=row.alt_dosage,
                gwas_ea=row.ea,
                gwas_nea=row.nea,
                drop_ambiguous=self.drop_ambiguous
            )
            
            effect_dosages.append(dosage)
            self.stats[status] += 1
        
        return effect_dosages, dict(self.stats)
    
    def reset_stats(self):
        """Reset harmonization statistics"""
        for key in self.stats:
            self.stats[key] = 0
