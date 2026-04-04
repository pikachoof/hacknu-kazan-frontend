import { useState } from 'react'

/**
 * AuthPage - Redone without TanStack Router
 * Matches the warm, editorial design of the "AI Brainstorm Canvas"
 */
export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)

  const handleGoogleAuth = () => {
    // Replace this logic with your specific Auth provider call
    // e.g., supabase.auth.signInWithOAuth({ provider: 'google' })
    console.log('Initiating Google OAuth...')
  }

  return (
    <div className="min-h-screen bg-[#ede8df] flex flex-col items-center justify-center p-4 font-sans text-[#2e2b27]">
      
      {/* Container / Card */}
      <div className="bg-[#fcfaf7] w-full max-w-md p-10 rounded-[2.5rem] shadow-sm border border-[#e2dcd0]/60">
        
        {/* Top Label - Matches 'HUMAN CONTROLS' style */}
        <div className="mb-10 text-center">
          <span className="text-[0.65rem] tracking-[0.2em] font-bold text-[#a66a43] uppercase mb-2 block">
            Human Controls
          </span>
          {/* Serif Heading for that editorial look */}
          <h1 className="font-serif text-4xl mb-3 tracking-tight leading-tight">
            {isLogin ? 'Welcome back' : 'Start session'}
          </h1>
          <p className="text-[#7c7469] text-sm max-w-[250px] mx-auto leading-relaxed italic">
            {isLogin 
              ? 'Enter your workspace to continue collaborating with Claude.' 
              : 'Create a new canvas and invite your team to brainstorm.'}
          </p>
        </div>

        {/* UI Toggle Switch - Matches the 'Assist/Lead' pills in your UI */}
        <div className="flex bg-[#f3efe6] p-1.5 rounded-full mb-8 max-w-[240px] mx-auto border border-[#e2dcd0]/50">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 text-[11px] uppercase tracking-wider font-bold py-2.5 px-4 rounded-full transition-all duration-300 ${
              isLogin ? 'bg-white shadow-sm text-[#2e2b27]' : 'text-[#b3aaa0]'
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 text-[11px] uppercase tracking-wider font-bold py-2.5 px-4 rounded-full transition-all duration-300 ${
              !isLogin ? 'bg-white shadow-sm text-[#2e2b27]' : 'text-[#b3aaa0]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Primary Action Button - The Terracotta Brown from your screenshot */}
        <button
          onClick={handleGoogleAuth}
          className="w-full bg-[#a66a43] hover:bg-[#8f5631] text-white py-4.5 px-6 rounded-full font-semibold text-sm tracking-wide transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-[#a66a43]/20 mb-8"
        >
          {/* Google Icon */}
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0 5.466 0 0 5.373 0 12s5.466 12 12.24 12c7.054 0 11.777-4.958 11.777-11.979 0-.718-.078-1.26-.172-1.736H12.24z" />
          </svg>
          Continue with Google
        </button>

        {/* Branding Footer */}
        <div className="text-center pt-2">
          <p className="text-[10px] text-[#b3aaa0] tracking-[0.15em] uppercase font-medium">
            Powered by <span className="text-[#2e2b27] font-bold">Liveblocks</span> & <span className="text-[#2e2b27] font-bold">Claude</span>
          </p>
        </div>

      </div>

      {/* Optional decorative helper text outside the card */}
      <p className="mt-8 text-[#7c7469]/50 text-xs tracking-widest uppercase font-bold">
        Spatial Intelligence • v1.0
      </p>
    </div>
  )
}