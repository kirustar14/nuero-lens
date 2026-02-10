import jsPDF from 'jspdf';
import type { PRSAnalysisResponse } from '@/types/api';
import { DISORDER_NAMES, FACTOR_INFO } from '@/types/api';

export function generatePDFReport(result: PRSAnalysisResponse) {
  const doc = new jsPDF();
  
  let y = 20;
  const lineHeight = 7;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Neuro-LENS Genomic Report', pageWidth / 2, y, { align: 'center' });
  
  y += lineHeight * 2;
  
  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Polygenic Risk Score Analysis', pageWidth / 2, y, { align: 'center' });
  
  y += lineHeight * 2;
  
  // Analysis Info
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text(`Analysis ID: ${result.analysis_id}`, 20, y);
  y += lineHeight;
  doc.text(`Date: ${new Date(result.analyzed_at).toLocaleString()}`, 20, y);
  y += lineHeight;
  doc.text(`Processing Time: ${result.processing_time_seconds.toFixed(2)}s`, 20, y);
  
  y += lineHeight * 2;
  
  // Horizontal line
  doc.setDrawColor(200);
  doc.line(20, y, pageWidth - 20, y);
  y += lineHeight;

  // Factor Scores Section
  if (result.factor_scores && result.factor_scores.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Psychiatric Factor Scores', 20, y);
    y += lineHeight * 1.5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    result.factor_scores.forEach((score) => {
      // Factor name
      doc.setFont('helvetica', 'bold');
      doc.text(`${score.factor}: ${score.label}`, 20, y);
      y += lineHeight;

      // Scores
      doc.setFont('helvetica', 'normal');
      doc.text(`Percentile: ${score.percentile.toFixed(1)}%`, 25, y);
      y += lineHeight;
      doc.text(`Z-Score: ${score.z_score.toFixed(2)}`, 25, y);
      y += lineHeight;
      doc.text(`Raw Score: ${score.raw_score.toFixed(6)}`, 25, y);
      y += lineHeight;

      // Brain systems
      doc.setFontSize(8);
      doc.setTextColor(100);
      const brainText = `Brain Systems: ${score.brain_systems}`;
      const splitText = doc.splitTextToSize(brainText, pageWidth - 50);
      doc.text(splitText, 25, y);
      y += lineHeight * splitText.length;

      y += lineHeight * 0.5;
      doc.setFontSize(9);
      doc.setTextColor(0);

      // Check if we need a new page
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    y += lineHeight;
  }

  // Disorder Scores Section
  if (y > 200) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Disorder-Specific PRS Scores', 20, y);
  y += lineHeight * 1.5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(20, y - 5, pageWidth - 40, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Disorder', 22, y);
  doc.text('PRS Score', 100, y);
  doc.text('SNPs', 140, y);
  doc.text('Status', 165, y);
  y += lineHeight;

  doc.setFont('helvetica', 'normal');

  const successfulScores = result.disorder_scores.filter(s => s.status === 'ok');
  successfulScores.forEach((score, index) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }

    // Alternating row colors
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(20, y - 5, pageWidth - 40, 7, 'F');
    }

    doc.text(DISORDER_NAMES[score.disorder] || score.disorder, 22, y);
    doc.text(score.raw_score.toFixed(6), 100, y);
    doc.text(score.snp_count.toLocaleString(), 140, y);
    doc.text('✓ Success', 165, y);
    y += lineHeight;
  });

  y += lineHeight * 2;

  // Summary
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 20, y);
  y += lineHeight;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total SNPs Analyzed: ${result.total_snps_analyzed.toLocaleString()}`, 20, y);
  y += lineHeight;
  doc.text(`Successful Disorders: ${result.successful_disorders} of ${result.total_disorders}`, 20, y);
  y += lineHeight;

  // Disclaimer (at bottom of last page)
  if (y > 250) {
    doc.addPage();
    y = 20;
  } else {
    y = 270;
  }

  doc.setFontSize(7);
  doc.setTextColor(100);
  const disclaimer = `DISCLAIMER: This report provides genetic risk estimates based on polygenic risk scores (PRS). These scores reflect genetic predisposition only and do not diagnose any medical or psychiatric condition. Many factors beyond genetics influence mental health, including environmental, social, and lifestyle factors. This report is for research and educational purposes only and should not be used for clinical decision-making without consultation with a qualified healthcare provider.`;
  
  const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 40);
  doc.text(disclaimerLines, 20, y);

  // Save
  const filename = `neuro-lens-report-${result.analysis_id.substring(0, 8)}.pdf`;
  doc.save(filename);
}
