import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Search,
  Clock,
  Sparkles,
  Award,
  CheckCircle,
  Filter,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Course } from '../../types';

export const CourseBrowsePage: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    // Fetch published courses
    fetch('/api/courses', { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.courses) setCourses(data.courses);
      })
      .catch(console.warn);

    // Fetch trainee competency-gap recommendations
    if (user?.role === 'TRAINEE') {
      fetch('/api/courses/recommendations', { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data.recommendations) setRecommendations(data.recommendations);
        })
        .catch(console.warn)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const filteredCourses = courses.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (filterType === 'LONG') return c.isLongDuration;
    if (filterType === 'SHORT') return !c.isLongDuration;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Real IMD Training Course Catalogue
            </h1>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              Official Curricula
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Institutional long-duration programs and operational refreshers for meteorological officers.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search radar, cyclone, NWP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 w-full text-xs rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-medium text-slate-700">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${filterType === 'ALL' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'hover:text-slate-900'}`}
            >
              All Courses
            </button>
            <button
              onClick={() => setFilterType('LONG')}
              className={`px-3 py-1.5 rounded-lg transition ${filterType === 'LONG' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'hover:text-slate-900'}`}
            >
              Institutional (1 yr)
            </button>
            <button
              onClick={() => setFilterType('SHORT')}
              className={`px-3 py-1.5 rounded-lg transition ${filterType === 'SHORT' ? 'bg-white text-blue-700 shadow-sm font-bold' : 'hover:text-slate-900'}`}
            >
              Refreshers
            </button>
          </div>
        </div>
      </div>

      {/* Trainee Competency-Gap Recommendation Banner (Section 9) */}
      {recommendations && recommendations.skillGap?.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-blue-800">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                <Sparkles className="w-4 h-4" />
                <span>Personalized Competency Gap Analysis (Section 9 Logic)</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Missing Required Skills for Designation: <span className="text-sky-300">{recommendations.jobDesignation}</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                The platform detected <strong className="text-amber-400">{recommendations.skillGap.length} required competencies</strong> not yet completed in your record. We have automatically highlighted courses that close this gap.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 max-w-md">
              {recommendations.skillGap.map((gap: any) => (
                <span
                  key={gap.id}
                  className="px-2 py-1 rounded bg-blue-950/80 border border-blue-400/40 text-[10px] text-blue-200 font-mono"
                >
                  {gap.code}: {gap.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => {
          const isRecommended = recommendations?.recommendedCourses?.some(
            (rc: any) => rc.id === course.id
          );

          return (
            <div
              key={course.id}
              className={`bg-white rounded-2xl border transition hover:shadow-lg flex flex-col justify-between overflow-hidden ${
                isRecommended
                  ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200 shadow-sm'
              }`}
            >
              <div className="p-6">
                {/* Header tags */}
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {course.code}
                  </span>

                  {isRecommended ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 border border-amber-300 text-amber-800 px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      Closes Skill Gap
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {course.isLongDuration ? 'Institutional Course' : 'Refresher Module'}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-slate-900 mb-2 leading-snug">
                  {course.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                  {course.description}
                </p>

                {/* Duration & Metadata */}
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{course.durationWeeks} Weeks</span>
                  </span>
                  <span>•</span>
                  <span>{course._count?.lessons || 0} Lessons</span>
                  <span>•</span>
                  <span>{course._count?.enrollments || 0} Enrolled</span>
                </div>

                {/* Competency Badges */}
                {course.competencies && course.competencies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {course.competencies.map((cc) => (
                      <span
                        key={cc.competency.id}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono"
                      >
                        {cc.competency.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer Button */}
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <Link
                  to={`/courses/${course.id}`}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <span>{user?.role === 'TRAINER' ? 'View Curriculum & Lessons' : user?.role === 'ADMIN' ? 'Inspect Syllabus' : 'View Syllabus & Enroll'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
