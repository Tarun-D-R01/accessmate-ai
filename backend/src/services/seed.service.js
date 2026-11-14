import bcrypt from 'bcrypt';
import { storageService } from './storage.service.js';

export const DEMO_USER_EMAIL = 'judge.demo@accessmate.ai';

export const SAMPLE_DOCUMENTS = [
  {
    title: 'RPwD Act — Assistive Device & Disability Pension Circular 2026',
    fileName: 'RPwD_Assistive_Subsidy_Circular_2026.pdf',
    mimeType: 'application/pdf',
    fileSize: 284512,
    isSample: true,
    extractedText: `MINISTRY OF SOCIAL JUSTICE AND EMPOWERMENT — DEPARTMENT OF EMPOWERMENT OF PERSONS WITH DISABILITIES (Divyangjan)
Notification Ref: DEPwD/ADIP/2026-27/Circular-14

Pursuant to Section 24 of the Rights of Persons with Disabilities (RPwD) Act, 2016, the Competent Authority hereby notifies revised disbursement norms under the Assistance to Disabled Persons for Purchase/Fitting of Aids and Appliances (ADIP) Scheme and the National Disability Pension Stipend.

1. ELIGIBILITY CRITERIA:
Beneficiaries possessing a valid Unique Disability ID (UDID) certification attesting a minimum 40% Benchmark Disability as assessed by a notified Medical Board, and whose aggregate familial monthly emoluments from all sources do not exceed INR 22,500/- per month, shall be entitled to 100% quantum subsidy up to INR 15,000/- for motorized tricycles, refreshable Braille displays, smart canes, and digital BTE hearing prostheses.

2. DISBURSEMENT & DIRECT BENEFIT TRANSFER (DBT):
Financial remittances including the monthly maintenance allowance of INR 2,500/- shall be effectuated exclusively via Aadhaar-seeded Direct Benefit Transfer (DBT) subsequent to biometric or iris authentication waiver for persons with severe locomotor or visual impairment.

3. GRIEVANCE REDRESSAL:
Aggrieved applicants may file an interlocutory representation before the District Social Welfare Officer within 30 calendar days from the date of impugned rejection.`,
    summary:
      'This government notice explains how people with disabilities can get free assistive devices (up to ₹15,000 for items like smart canes, Braille displays, hearing aids, or motorized tricycles) and a ₹2,500 monthly pension payment directly in their bank account.',
    simplifiedText: `Simple Step-by-Step Guide to This Government Scheme:

1. Who Can Apply?
- You need a valid UDID (Unique Disability ID) card showing at least 40% disability.
- Your total family income must be ₹22,500 per month or less.

2. What Free Support Do You Get?
- Up to ₹15,000 (100% free) to buy helpful devices like Smart Canes, Braille Displays, Digital Hearing Aids, or Motorized Tricycles.
- A monthly support allowance of ₹2,500 sent straight to your bank account.

3. How Is the Money Sent?
- Money is sent directly to your Aadhaar-linked bank account (Direct Benefit Transfer).
- If your disability makes fingerprint scanning difficult, you are exempt from fingerprint checks.

4. What If Your Application Is Rejected?
- You have 30 days to submit a simple appeal to your District Social Welfare Officer.`,
    keyTakeaways: [
      '100% free grant up to ₹15,000 for smart canes, Braille displays, hearing aids, and motorized tricycles.',
      'Monthly pension allowance of ₹2,500 via Direct Benefit Transfer (DBT).',
      'Requires a UDID card (40%+ disability) and family income of ₹22,500/month or less.',
      'Fingerprint scan is waived if your disability prevents biometric verification.',
    ],
    complexTerms: [
      {
        term: 'Benchmark Disability (40%)',
        simpleExplanation:
          'A medical certification showing at least 40% disability on your official government UDID card.',
      },
      {
        term: 'Aggregate Familial Monthly Emoluments',
        simpleExplanation:
          'The total combined monthly income earned by all members of your household.',
      },
      {
        term: 'Direct Benefit Transfer (DBT)',
        simpleExplanation:
          'Government money sent directly into your bank account without middlemen.',
      },
      {
        term: 'Interlocutory Representation',
        simpleExplanation:
          'A formal request or appeal asking a higher officer to review and fix a rejected application.',
      },
    ],
    qaHistory: [
      {
        question: 'What is the maximum income limit to get the free smart cane or hearing aid?',
        answer:
          'Your total family monthly income must be ₹22,500 or less to receive the 100% free subsidy (up to ₹15,000) for devices like smart canes, Braille displays, or hearing aids.',
        askedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      },
    ],
  },
  {
    title: 'Hospital Discharge Summary & Daily Medication Guide',
    fileName: 'Patient_Discharge_Medication_Protocol.pdf',
    mimeType: 'application/pdf',
    fileSize: 192400,
    isSample: true,
    extractedText: `DEPARTMENT OF INTERNAL MEDICINE & CARDIOLOGY — CLINICAL DISCHARGE SUMMARY
Diagnosis: Acute Hypertensive Urgency with Mild Glycemic Dysregulation (Type 2 DM)

PHARMACOLOGICAL REGIMEN UPON DISCHARGE:
1. Tab. Amlodipine 5mg PO OD post-prandial (morning) — for systemic arterial blood pressure titration.
2. Tab. Metformin Hydrochloride SR 500mg PO BD immediately following morning and evening meals — monitor for gastrointestinal intolerance.
3. Tab. Paracetamol 650mg PO PRN q6h (maximum 3g/24h) strictly for pyrexia or cephalalgia.

AMBULATORY CARE & RED FLAG WARNINGS:
Patient is advised strict sodium restriction (<2g/day) and regular domiciliary sphygmomanometry twice daily. Present immediately to the Emergency Triage if experiencing acute dyspnea, retrosternal chest tightness, syncope, or persistent systolic BP >180 mmHg.`,
    summary:
      'This hospital discharge sheet lists your 3 daily medicines for blood pressure and blood sugar, explains when to take them with food, and lists warning signs that mean you should visit a doctor right away.',
    simplifiedText: `Your Easy Daily Medicine & Care Schedule:

1. Morning & Evening Medicines:
- Amlodipine (5 mg tablet): Take 1 tablet every morning AFTER breakfast. This keeps your blood pressure steady.
- Metformin SR (500 mg tablet): Take 1 tablet twice a day—once right AFTER breakfast and once right AFTER dinner. This controls your blood sugar.
- Paracetamol (650 mg tablet): Take ONLY if needed for fever or headache, with at least a 6-hour gap between tablets (do not take more than 4 tablets in 24 hours).

2. Daily Care at Home:
- Eat low-salt food (less than half a teaspoon of salt per day).
- Check and write down your blood pressure at home every morning and evening.

3. When to Go to the Hospital Immediately (Warning Signs):
- Trouble breathing or shortness of breath
- Tightness or pain in the center of your chest
- Feeling dizzy or fainting
- Blood pressure reading above 180`,
    keyTakeaways: [
      'Amlodipine 5mg: 1 tablet every morning after breakfast for blood pressure.',
      'Metformin 500mg: 1 tablet after breakfast and 1 tablet after dinner for blood sugar.',
      'Keep salt intake very low and check blood pressure twice daily at home.',
      'Seek emergency medical help if you have chest tightness, breathing trouble, fainting, or BP over 180.',
    ],
    complexTerms: [
      {
        term: 'PO OD / PO BD Post-Prandial',
        simpleExplanation:
          'Take by mouth once a day (OD) or twice a day (BD) right after eating a meal.',
      },
      {
        term: 'PRN q6h',
        simpleExplanation:
          'Take only when needed, leaving at least 6 hours between doses.',
      },
      {
        term: 'Pyrexia & Cephalalgia',
        simpleExplanation: 'Medical words for fever (pyrexia) and headache (cephalalgia).',
      },
      {
        term: 'Acute Dyspnea & Syncope',
        simpleExplanation:
          'Sudden difficulty breathing (dyspnea) and fainting or passing out (syncope).',
      },
    ],
    qaHistory: [
      {
        question: 'When should I take Metformin and do I take it before or after food?',
        answer:
          'Take Metformin 500mg twice a day—once in the morning right after breakfast, and once in the evening right after dinner. Taking it after food helps prevent stomach upset.',
        askedAt: new Date(Date.now() - 1800 * 1000).toISOString(),
      },
    ],
  },
];

export const ensureDemoUserAndSeed = async () => {
  let user = await storageService.findUserByEmail(DEMO_USER_EMAIL);

  if (!user) {
    const hashedPassword = await bcrypt.hash('DemoJudge@2026', 10);
    user = await storageService.createUser({
      name: 'Hackathon Judge (Demo)',
      email: DEMO_USER_EMAIL,
      password: hashedPassword,
      preferredLanguage: 'English',
      isDemo: true,
    });
  }

  const existingDocs = await storageService.getDocumentsByUser(user._id);
  if (existingDocs.length === 0) {
    for (const sampleDoc of SAMPLE_DOCUMENTS) {
      const createdDoc = await storageService.createDocument({
        ...sampleDoc,
        userId: user._id,
      });
      await storageService.logActivity({
        userId: user._id,
        type: 'DOCUMENT_ANALYZE',
        title: `Analyzed & Simplified: ${createdDoc.title}`,
        summary: createdDoc.summary,
        metadata: {
          documentId: createdDoc._id,
          fileName: createdDoc.fileName,
          isSample: true,
        },
      });
    }
  }

  await storageService.logActivity({
    userId: user._id,
    type: 'AUTH_DEMO',
    title: '1-Click Judge Demo Session Activated',
    summary: 'Logged into pre-seeded accessible workspace with sample documents.',
    metadata: { email: user.email },
  });

  const finalDocs = await storageService.getDocumentsByUser(user._id);
  return { user, documents: finalDocs };
};
