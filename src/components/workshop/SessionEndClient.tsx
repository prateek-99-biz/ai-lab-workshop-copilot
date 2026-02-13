'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Download, Mail, CheckCircle, PartyPopper, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { FeedbackForm } from './FeedbackForm';
import toast from 'react-hot-toast';

interface Submission {
  id: string;
  content: string;
  stepTitle: string;
  moduleTitle: string;
}

interface SessionEndClientProps {
  sessionId: string;
  organizationName: string;
  participantId: string;
  participantName: string;
  participantEmail: string | null;
  hasEmailConsent: boolean;
  feedbackSubmitted: boolean;
  submissions: Submission[];
}

export function SessionEndClient({
  sessionId,
  organizationName,
  participantId,
  participantName,
  participantEmail,
  hasEmailConsent,
  feedbackSubmitted: initialFeedbackSubmitted,
  submissions,
}: SessionEndClientProps) {
  const [email, setEmail] = useState(participantEmail || '');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(initialFeedbackSubmitted);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleFeedbackSubmitted = () => {
    setFeedbackSubmitted(true);
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-pack-${participantName.toLowerCase().replace(/\s+/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setPdfDownloaded(true);
      toast.success('Prompt Pack downloaded!');

      // Log analytics
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          sessionId,
          eventType: 'pdf_downloaded',
        }),
      });
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      setEmailError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');
    setIsEmailing(true);

    try {
      const response = await fetch('/api/email/prompt-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          sessionId,
          email,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to send email');
      }

      setEmailSent(true);
      toast.success('Prompt Pack sent to your email!');

      // Log analytics
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          sessionId,
          eventType: 'email_sent',
        }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <PartyPopper className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Workshop Complete!
          </h1>
          <p className="text-white/80">
            Great job, {participantName}!
            {!feedbackSubmitted && ' Please share your feedback to receive your Prompt Pack.'}
            {feedbackSubmitted && ' Here\'s your Prompt Pack from today\'s workshop.'}
          </p>
        </div>

        {/* Show Feedback Form if not submitted */}
        {!feedbackSubmitted && (
          <FeedbackForm
            sessionId={sessionId}
            participantId={participantId}
            participantName={participantName}
            onFeedbackSubmitted={handleFeedbackSubmitted}
          />
        )}

        {/* Show Prompt Pack sections only after feedback is submitted */}
        {feedbackSubmitted && (
          <>
            {/* Submissions Summary */}
            {submissions.length > 0 && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="font-semibold text-gray-900 mb-4">
                    Your Submitted Prompts ({submissions.length})
                  </h2>
                  <div className="space-y-4">
                    {submissions.map((sub) => (
                      <div 
                        key={sub.id}
                        className="p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="text-sm text-gray-500 mb-1">
                          {sub.moduleTitle} • {sub.stepTitle}
                        </div>
                        <p className="text-gray-700 font-mono text-sm whitespace-pre-wrap">
                          {sub.content.length > 200 
                            ? sub.content.slice(0, 200) + '...' 
                            : sub.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

        {/* Download Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  pdfDownloaded ? 'bg-green-100' : 'bg-brand-100'
                }`}>
                  {pdfDownloaded ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Download className="w-6 h-6 text-brand-600" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Download Your Prompt Pack</h3>
                <p className="text-sm text-gray-600 mt-1 mb-4">
                  Get a document with all your prompts and workshop takeaways.
                </p>
                <Button
                  onClick={handleDownloadPDF}
                  isLoading={isDownloading}
                  variant={pdfDownloaded ? 'secondary' : 'primary'}
                >
                  {pdfDownloaded ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Downloaded — Download Again
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  emailSent ? 'bg-green-100' : 'bg-brand-100'
                }`}>
                  {emailSent ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Mail className="w-6 h-6 text-brand-600" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Email Your Prompt Pack</h3>
                <p className="text-sm text-gray-600 mt-1 mb-4">
                  We'll send you a copy with all your prompts.
                </p>

                {!emailSent ? (
                  <div className="space-y-4">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError('');
                      }}
                      placeholder="your@email.com"
                      error={emailError}
                    />

                    <Button
                      onClick={handleSendEmail}
                      isLoading={isEmailing}
                      variant="outline"
                      disabled={!email}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send to Email
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>Email sent to {email}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Notice */}
        <div className="glass-subtle rounded-lg p-4 text-sm text-gray-700 border border-white/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Your session data will be automatically deleted in 72 hours.
              Download or email your Prompt Pack now to keep your work.
            </p>
          </div>
        </div>

        {/* Return Home */}
        <div className="text-center mt-8">
          <Image
            src="/biz-group-logo.webp"
            alt="Biz Group"
            width={48}
            height={48}
            className="mx-auto mb-3 rounded-lg"
          />
          <p className="text-white/70 mb-4">
            Thanks for joining the {organizationName} workshop!
          </p>
          <p className="text-white/50 text-xs mb-4">
            Powered by Biz Group
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href={`/s/${sessionId}`}>
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Workshop
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
