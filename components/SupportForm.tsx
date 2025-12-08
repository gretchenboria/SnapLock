import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

interface SupportFormProps {
  userEmail?: string;
  username?: string;
}

export function SupportForm({ userEmail = '', username = '' }: SupportFormProps) {
  const [name, setName] = useState(username);
  const [email, setEmail] = useState(userEmail);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Using Formspree - free service for form submissions
      const response = await fetch('https://formspree.io/f/xnnqlkjo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          _replyto: email,
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setSubject('');
        setMessage('');
        setTimeout(() => {
          setSubmitStatus('idle');
        }, 5000);
      } else {
        throw new Error('Form submission failed');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('Failed to send message. Please try again or email me@gretchenboria.com directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-gray-200 block mb-2 tracking-wide">
            NAME
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm focus:border-scifi-cyan-light focus:outline-none transition-colors"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-200 block mb-2 tracking-wide">
            EMAIL
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm focus:border-scifi-cyan-light focus:outline-none transition-colors"
            placeholder="your@email.com"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-200 block mb-2 tracking-wide">
          SUBJECT
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm focus:border-scifi-cyan-light focus:outline-none transition-colors"
        >
          <option value="">Select a topic...</option>
          <option value="Bug Report">Bug Report</option>
          <option value="Feature Request">Feature Request</option>
          <option value="API Configuration Help">API Configuration Help</option>
          <option value="Performance Issue">Performance Issue</option>
          <option value="General Question">General Question</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-200 block mb-2 tracking-wide">
          MESSAGE
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          className="w-full bg-black/40 border border-white/20 rounded px-3 py-2 text-white text-sm focus:border-scifi-cyan-light focus:outline-none transition-colors resize-none"
          placeholder="Describe your issue or question in detail..."
        />
      </div>

      {/* Status Messages */}
      {submitStatus === 'success' && (
        <div className="bg-green-900/20 border border-green-500/50 rounded p-3 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          <div className="text-xs text-green-300">
            <p className="font-bold">Message sent!</p>
            <p>I'll get back to you soon.</p>
          </div>
        </div>
      )}

      {submitStatus === 'error' && (
        <div className="bg-red-900/20 border border-red-500/50 rounded p-3 flex items-start gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-300">
            <p className="font-bold">Failed to send</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Direct Contact Info */}
      <div className="bg-blue-900/10 border border-blue-500/20 rounded p-3">
        <p className="text-xs text-gray-400">
          You can also reach me directly at{' '}
          <a
            href="mailto:me@gretchenboria.com"
            className="text-scifi-cyan-light hover:text-scifi-cyan-bright font-mono underline"
          >
            me@gretchenboria.com
          </a>
        </p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !name || !email || !subject || !message}
        className="w-full px-4 py-3 text-sm font-bold text-black bg-scifi-cyan-light hover:bg-scifi-cyan-bright rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            SENDING...
          </>
        ) : (
          <>
            <Send size={16} />
            SEND MESSAGE
          </>
        )}
      </button>
    </form>
  );
}
