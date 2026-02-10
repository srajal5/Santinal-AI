import { SignIn } from '@clerk/clerk-react'

function Login() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-white mb-6 text-center">
          Sentinel AI
        </h1>
        <div 
          className="clerk-sign-in-wrapper"
          style={{ 
            backgroundColor: '#111827', 
            borderRadius: '12px',
            padding: '24px'
          }}
        >
          <SignIn 
            appearance={{
              layout: {
                socialButtonsVariant: "iconButton",
                showOptionalFields: false,
              },
              variables: {
                // Primary color
                colorPrimary: "#16a34a",
                colorPrimaryHover: "#15803d",
                colorTextOnPrimaryBackground: "#ffffff",
                
                // Backgrounds
                colorBackground: "#111827",
                colorBackgroundHover: "#1f2937",
                colorInputBackground: "#1f2937",
                
                // Text - CRITICAL for visibility
                colorText: "#f9fafb",
                colorTextSecondary: "#9ca3af",
                colorTextOnBackground: "#f9fafb",
                colorInputText: "#e5e7eb",
                
                // Borders
                colorInputBorder: "#374151",
                colorInputBorderHover: "#4b5563",
                colorBorder: "#374151",
                
                // Other
                colorDanger: "#ef4444",
                colorSuccess: "#22c55e",
                
                // Sizing
                borderRadius: "8px",
                fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
              },
              elements: {
                // Card styling
                card: {
                  backgroundColor: "#111827 !important",
                  border: "1px solid #374151 !important",
                  borderRadius: "12px !important",
                },
                
                // Header
                headerTitle: {
                  color: "#f9fafb !important",
                  fontSize: "20px !important",
                  fontWeight: "600 !important",
                },
                headerSubtitle: {
                  color: "#9ca3af !important",
                  fontSize: "14px !important",
                },
                
                // Form fields
                formFieldRoot: {
                  marginBottom: "16px",
                },
                formFieldLabel: {
                  color: "#9ca3af !important",
                  fontSize: "13px !important",
                  fontWeight: "500 !important",
                  marginBottom: "6px !important",
                  display: "block",
                },
                formFieldInput: {
                  backgroundColor: "#1f2937 !important",
                  border: "1px solid #374151 !important",
                  color: "#e5e7eb !important",
                  borderRadius: "8px !important",
                  padding: "12px !important",
                  fontSize: "14px !important",
                  width: "100%",
                  boxSizing: "border-box",
                },
                formFieldInputShowPasswordButton: {
                  color: "#9ca3af !important",
                },
                
                // Buttons
                formButtonPrimary: {
                  backgroundColor: "#16a34a !important",
                  borderRadius: "8px !important",
                  fontSize: "14px !important",
                  fontWeight: "500 !important",
                  height: "44px !important",
                  color: "#ffffff !important",
                  width: "100%",
                  marginTop: "8px",
                },
                formButtonSecondary: {
                  backgroundColor: "transparent !important",
                  border: "1px solid #374151 !important",
                  color: "#e5e7eb !important",
                  borderRadius: "8px !important",
                  fontSize: "14px !important",
                  height: "44px !important",
                },
                
                // Social buttons
                socialButtonsBlockButton: {
                  backgroundColor: "#1f2937 !important",
                  border: "1px solid #374151 !important",
                  color: "#e5e7eb !important",
                  height: "44px !important",
                  width: "100%",
                },
                
                // Divider
                dividerLine: {
                  backgroundColor: "#374151 !important",
                },
                dividerText: {
                  color: "#9ca3af !important",
                  fontSize: "12px !important",
                },
                
                // Footer
                footer: {
                  paddingTop: "16px",
                },
                footerAction: {
                  marginTop: "16px",
                },
                footerActionLink: {
                  color: "#16a34a !important",
                  fontSize: "13px !important",
                },
                
                // Identity preview
                identityPreview: {
                  backgroundColor: "#1f2937 !important",
                  border: "1px solid #374151 !important",
                  borderRadius: "8px !important",
                },
                identityPreviewText: {
                  color: "#e5e7eb !important",
                },
                identityPreviewEditButton: {
                  color: "#16a34a !important",
                },
                
                // OTP
                otpCodeFieldInput: {
                  backgroundColor: "#1f2937 !important",
                  border: "1px solid #374151 !important",
                  color: "#e5e7eb !important",
                  borderRadius: "8px !important",
                },
                
                // Error text
                formFieldErrorText: {
                  color: "#ef4444 !important",
                  fontSize: "12px !important",
                },
                
                // Badge
                badge: {
                  backgroundColor: "#16a34a !important",
                  color: "#ffffff !important",
                  fontSize: "11px !important",
                },
              },
            }}
            routing="hash"
            signUpUrl="/signup"
            redirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  )
}

export default Login
