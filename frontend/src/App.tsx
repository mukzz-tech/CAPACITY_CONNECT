import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VoiceProvider } from './context/VoiceContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { VoiceAssistantWidget } from './components/VoiceAssistantWidget';

// Segment Pages
import { HomePage } from './segments/1_public/HomePage';
import { LoginPage } from './segments/1_public/LoginPage';
import { SignupPage } from './segments/1_public/SignupPage';
import { ForgotPasswordPage } from './segments/1_public/ForgotPasswordPage';
import { VerifyCertificatePage } from './segments/1_public/VerifyCertificatePage';
import { CourseBrowsePage } from './segments/2_courses/CourseBrowsePage';
import { CourseDetailPage } from './segments/2_courses/CourseDetailPage';
import { StudyMaterialPage } from './segments/3_study/StudyMaterialPage';
import { AssessmentPage } from './segments/4_assessments/AssessmentPage';
import { ChatbotPage } from './segments/5_chatbot/ChatbotPage';
import { ProfilePage } from './segments/6_profile/ProfilePage';
import { TrainerStudioPage } from './segments/7_trainer/TrainerStudioPage';
import { AdminConsolePage } from './segments/8_admin/AdminConsolePage';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-slate-400">Verifying session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white rounded-2xl border border-rose-200 text-center">
        <h2 className="text-base font-bold text-rose-800 mb-1">Access Restricted</h2>
        <p className="text-xs text-slate-600">
          This portal segment requires one of: [{allowedRoles.join(', ')}].
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VoiceProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* 1. Public Segment */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/verify/:code" element={<VerifyCertificatePage />} />

                {/* 2. Courses Segment */}
                <Route path="/courses" element={<CourseBrowsePage />} />
                <Route path="/courses/:id" element={<CourseDetailPage />} />

                {/* 3. Study Material Segment */}
                <Route
                  path="/courses/:id/study"
                  element={
                    <ProtectedRoute>
                      <StudyMaterialPage />
                    </ProtectedRoute>
                  }
                />

                {/* 4. Assessments Segment */}
                <Route
                  path="/assessments/:id"
                  element={
                    <ProtectedRoute>
                      <AssessmentPage />
                    </ProtectedRoute>
                  }
                />

                {/* 5. Chatbot Segment */}
                <Route
                  path="/chatbot"
                  element={
                    <ProtectedRoute>
                      <ChatbotPage />
                    </ProtectedRoute>
                  }
                />

                {/* 6. Profile Segment */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* 7. Trainer Tools Segment */}
                <Route
                  path="/trainer"
                  element={
                    <ProtectedRoute allowedRoles={['TRAINER', 'ADMIN']}>
                      <TrainerStudioPage />
                    </ProtectedRoute>
                  }
                />

                {/* 8. Admin Console Segment */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminConsolePage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
            <VoiceAssistantWidget />
          </div>
        </VoiceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
