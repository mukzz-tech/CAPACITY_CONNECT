import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Award, CheckCircle2, AlertTriangle, Download, ArrowLeft } from 'lucide-react';

export const VerifyCertificatePage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    setLoading(true);

    fetch(`/api/certificates/verify/${code}`)
      .then(async (res) => {
        const json = await res.json();
        if (res.ok && json.isValid) {
          setData(json.certificate);
        } else {
          setError(json.message || 'Certificate verification failed.');
        }
      })
      .catch((err) => {
        setError('Network error while querying credential registry.');
      })
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        {/* Certificate Header Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white p-8 text-center border-b border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
            <Award className="w-10 h-10" />
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-amber-400 font-semibold mb-1">
            Official Credential Verification Service
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            India Meteorological Department
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ministry of Earth Sciences, Government of India
          </p>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Querying cryptographic credential registry...
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center">
              <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-rose-800 mb-1">Certificate Not Found</h2>
              <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Authenticity Badge */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Officially Verified IMD Training Certificate
                  </h3>
                  <p className="text-xs text-emerald-700">
                    This certificate is genuine and registered in the National Capacity Building Database.
                  </p>
                </div>
              </div>

              {/* Trainee & Course Details Card */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Recipient Trainee</span>
                    <strong className="text-sm text-slate-900 font-bold block">{data.traineeName}</strong>
                    <span className="text-slate-500 text-[11px]">{data.recipientDesignation} • {data.recipientDepartment}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Course Title</span>
                    <strong className="text-sm text-blue-900 font-bold block">{data.courseTitle}</strong>
                    <span className="text-slate-500 text-[11px]">Course Code: {data.courseCode}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Final Score</span>
                    <span className="font-bold text-slate-900 text-sm font-mono">{Number(data.finalScore).toFixed(1)}%</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Official Standing</span>
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                      {data.grade}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Date of Issue</span>
                    <span className="text-slate-700 font-medium">
                      {new Date(data.issueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Certificate ID</span>
                    <span className="font-mono text-[11px] text-slate-600 select-all font-semibold">
                      {data.certificateCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {data.pdfUrl && (
                <div className="text-center pt-2">
                  <a
                    href={data.pdfUrl}
                    download={`IMD_Certificate_${data.certificateCode}.pdf`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-md shadow-blue-600/30"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Signed PDF Document</span>
                  </a>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
