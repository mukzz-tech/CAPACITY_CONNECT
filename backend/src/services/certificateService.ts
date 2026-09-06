import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '../prisma.js';

export interface CertificateData {
  certificateCode: string;
  traineeName: string;
  courseTitle: string;
  finalScore: number;
  grade: string;
  issueDate: Date;
  verificationUrl: string;
}

export class CertificateService {
  /**
   * Generates a verifiable PDF certificate with an embedded dynamic QR code
   */
  public static async generateCertificatePdf(data: CertificateData): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // Landscape A4

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Background and border
    page.drawRectangle({
      x: 20,
      y: 20,
      width: 802,
      height: 555,
      borderColor: rgb(0.1, 0.28, 0.46), // IMD Navy
      borderWidth: 4,
      color: rgb(0.98, 0.99, 1.0),
    });

    page.drawRectangle({
      x: 28,
      y: 28,
      width: 786,
      height: 539,
      borderColor: rgb(0.72, 0.58, 0.2), // Gold inner border
      borderWidth: 1.5,
    });

    // Header Titles
    page.drawText('GOVERNMENT OF INDIA', {
      x: 320,
      y: 520,
      size: 14,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText('MINISTRY OF EARTH SCIENCES — INDIA METEOROLOGICAL DEPARTMENT', {
      x: 180,
      y: 498,
      size: 13,
      font: fontBold,
      color: rgb(0.08, 0.28, 0.52),
    });

    page.drawText('NATIONAL METEOROLOGICAL TRAINING CENTRE', {
      x: 260,
      y: 478,
      size: 11,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText('CERTIFICATE OF CAPACITY BUILDING & MERIT', {
      x: 215,
      y: 430,
      size: 18,
      font: fontBold,
      color: rgb(0.08, 0.25, 0.45),
    });

    page.drawText('This is to certify that', {
      x: 350,
      y: 390,
      size: 12,
      font: fontItalic,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Trainee Name
    const nameWidth = fontBold.widthOfTextAtSize(data.traineeName.toUpperCase(), 24);
    page.drawText(data.traineeName.toUpperCase(), {
      x: (842 - nameWidth) / 2,
      y: 355,
      size: 24,
      font: fontBold,
      color: rgb(0.12, 0.22, 0.35),
    });

    page.drawLine({
      start: { x: 180, y: 345 },
      end: { x: 662, y: 345 },
      thickness: 1,
      color: rgb(0.72, 0.58, 0.2),
    });

    // Course completion text
    const completionText = `has successfully completed the institutional training curriculum in`;
    page.drawText(completionText, {
      x: 210,
      y: 320,
      size: 13,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    const courseWidth = fontBold.widthOfTextAtSize(data.courseTitle, 16);
    page.drawText(data.courseTitle, {
      x: (842 - courseWidth) / 2,
      y: 295,
      size: 16,
      font: fontBold,
      color: rgb(0.08, 0.28, 0.52),
    });

    // Scores and Grade
    const scoreText = `Securing a Final Composite Score of ${data.finalScore.toFixed(1)}% with an Official Standing of: ${data.grade}`;
    const scoreWidth = fontBold.widthOfTextAtSize(scoreText, 12);
    page.drawText(scoreText, {
      x: (842 - scoreWidth) / 2,
      y: 265,
      size: 12,
      font: fontBold,
      color: rgb(0.2, 0.45, 0.2),
    });

    // Generate QR Code PNG buffer
    const qrPngBuffer = await QRCode.toBuffer(data.verificationUrl, {
      type: 'png',
      width: 110,
      margin: 1,
    });
    const qrImage = await pdfDoc.embedPng(qrPngBuffer);

    // Draw QR Code
    page.drawImage(qrImage, {
      x: 70,
      y: 70,
      width: 100,
      height: 100,
    });

    page.drawText('Scan to verify authenticity', {
      x: 65,
      y: 55,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Certificate metadata
    page.drawText(`Certificate ID: ${data.certificateCode}`, {
      x: 200,
      y: 110,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText(`Date of Issuance: ${new Date(data.issueDate).toLocaleDateString('en-GB')}`, {
      x: 200,
      y: 90,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText('Capacity Connect Portal — SIH 2026 PS #26075', {
      x: 200,
      y: 70,
      size: 9,
      font: fontItalic,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Signatures
    page.drawText('Director General of Meteorology', {
      x: 600,
      y: 70,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText('India Meteorological Department', {
      x: 600,
      y: 55,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawLine({
      start: { x: 590, y: 90 },
      end: { x: 770, y: 90 },
      thickness: 1,
      color: rgb(0.4, 0.4, 0.4),
    });

    const pdfBytes = await pdfDoc.save();
    const base64Pdf = Buffer.from(pdfBytes).toString('base64');
    return `data:application/pdf;base64,${base64Pdf}`;
  }

  /**
   * Issue certificate upon course completion
   */
  public static async issueCertificateIfEligible(userId: string, courseId: string) {
    // Check if certificate already exists
    const existing = await prisma.certificate.findFirst({
      where: { userId, courseId },
    });
    if (existing) return existing;

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        user: { include: { profile: true } },
        course: true,
      },
    });

    if (!enrollment || enrollment.finalScore === null || enrollment.finalScore < 50.0) {
      return null;
    }

    const certCode = `IMD-CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verificationUrl = `${clientUrl}/verify/${certCode}`;

    const pdfDataUrl = await this.generateCertificatePdf({
      certificateCode: certCode,
      traineeName: enrollment.user.profile?.fullName || enrollment.user.email,
      courseTitle: enrollment.course.title,
      finalScore: enrollment.finalScore,
      grade: enrollment.grade || 'PASSED',
      issueDate: new Date(),
      verificationUrl,
    });

    const certificate = await prisma.certificate.create({
      data: {
        certificateCode: certCode,
        userId,
        courseId,
        traineeName: enrollment.user.profile?.fullName || enrollment.user.email,
        courseTitle: enrollment.course.title,
        finalScore: enrollment.finalScore,
        grade: enrollment.grade || 'PASSED',
        qrCodeUrl: verificationUrl,
        pdfFileUrl: pdfDataUrl,
      },
    });

    return certificate;
  }
}
