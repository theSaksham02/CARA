(function attachCaraAuth(globalScope) {
  const SUPABASE_URL = 'https://dejibrpqparruwqsklvl.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlamlicnBxcGFycnV3cXNrbHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MjAxMjYsImV4cCI6MjA5MTE5NjEyNn0.SAO8wx9MQXbvfgekvJ0i5gCMjtjzHDbj8PiygCozheg';
  const REDIRECTS = {
    clinician: 'the-ward-overview.html',
    patient: 'patient-compass-home.html',
  };
  const DEMO_PORTAL_KEY = 'cara-demo-portal';

  let supabaseClient = null;

  function getSupabase() {
    if (supabaseClient) {
      return supabaseClient;
    }

    if (!globalScope.supabase || typeof globalScope.supabase.createClient !== 'function') {
      console.warn('CARA Auth: Supabase client not available. Demo mode only.');
      return null;
    }

    try {
      supabaseClient = globalScope.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });
    } catch (error) {
      console.warn('CARA Auth: Failed to init Supabase:', error.message);
      return null;
    }

    return supabaseClient;
  }

  async function getSession() {
    const client = getSupabase();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session || null;
  }

  async function getAccessToken() {
    const session = await getSession();
    return session?.access_token || null;
  }

  async function signOut() {
    clearDemoMode();
    await getSupabase().auth.signOut();
  }

  function setDemoMode(portal) {
    globalScope.sessionStorage.setItem(DEMO_PORTAL_KEY, portal);
  }

  function getDemoMode() {
    return globalScope.sessionStorage.getItem(DEMO_PORTAL_KEY);
  }

  function clearDemoMode() {
    globalScope.sessionStorage.removeItem(DEMO_PORTAL_KEY);
  }

  function wireLogoutButton(button) {
    button.addEventListener('click', async () => {
      const originalText = button.textContent;
      button.disabled = true;
      button.classList.add('opacity-70');

      try {
        await signOut();
        globalScope.location.href = button.dataset.redirectTo || 'index.html';
      } catch (error) {
        button.disabled = false;
        button.classList.remove('opacity-70');
        button.textContent = error.message || originalText;
        globalScope.setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    });
  }

  function setMessage(element, message, tone = 'neutral') {
    if (!element) {
      return;
    }

    const tones = {
      neutral: 'text-on-surface-variant',
      success: 'text-primary',
      error: 'text-error',
    };

    element.textContent = message;
    element.className = `text-sm min-h-6 ${tones[tone] || tones.neutral}`;
  }

  async function redirectIfAuthenticated(form) {
    const session = await getSession();
    if (!session) {
      return;
    }

    const redirectTo = form.dataset.redirectTo || REDIRECTS[form.dataset.portal] || 'index.html';
    globalScope.location.href = redirectTo;
  }

  function wireAuthForm(form) {
    const portal = form.dataset.portal || 'patient';
    const redirectTo = form.dataset.redirectTo || REDIRECTS[portal] || 'index.html';
    const emailInput = form.querySelector('[data-auth-email]');
    const passwordInput = form.querySelector('[data-auth-password]');
    const submitButton = form.querySelector('[data-auth-submit]');
    const toggleButton = form.querySelector('[data-auth-toggle]');
    const statusElement = form.querySelector('[data-auth-message]');

    if (!emailInput || !passwordInput || !submitButton) {
      return;
    }

    let mode = 'sign-in';

    const updateMode = () => {
      const isSignUp = mode === 'sign-up';
      submitButton.textContent = isSignUp ? 'Create Account' : 'Sign In';

      if (toggleButton) {
        toggleButton.textContent = isSignUp ? 'Already have an account? Sign in' : 'Need an account? Create one';
      }

      setMessage(
        statusElement,
        isSignUp
          ? 'Create a simple email + password account for this portal.'
          : 'Sign in with the email and password you used for this portal.'
      );
    };

    updateMode();

    toggleButton?.addEventListener('click', () => {
      mode = mode === 'sign-in' ? 'sign-up' : 'sign-in';
      updateMode();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        setMessage(statusElement, 'Enter both email and password.', 'error');
        return;
      }

      if (password.length < 6) {
        setMessage(statusElement, 'Use at least 6 characters for the password.', 'error');
        return;
      }

      submitButton.disabled = true;
      submitButton.classList.add('opacity-70');
      setMessage(statusElement, mode === 'sign-up' ? 'Creating account...' : 'Signing you in...');

      try {
        const supabase = getSupabase();

        if (mode === 'sign-up') {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                portal,
                role: portal === 'clinician' ? 'clinician' : 'patient',
              },
            },
          });

          if (error) {
            throw error;
          }

          if (data.session) {
            clearDemoMode();
            globalScope.location.href = redirectTo;
            return;
          }

          setMessage(
            statusElement,
            'Account created. If email confirmation is enabled, confirm your email first, then sign in.',
            'success'
          );
          mode = 'sign-in';
          updateMode();
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        clearDemoMode();
        globalScope.location.href = redirectTo;
      } catch (error) {
        setMessage(statusElement, error.message || 'Authentication failed.', 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-70');
      }
    });

    redirectIfAuthenticated(form).catch((error) => {
      setMessage(statusElement, error.message || 'Could not restore your session.', 'error');
    });
  }

  function wireDemoButton(button) {
    button.addEventListener('click', () => {
      const portal = button.dataset.demoPortal || 'patient';
      const redirectTo = button.dataset.demoRedirect || REDIRECTS[portal] || 'index.html';
      setDemoMode(portal);
      globalScope.location.href = redirectTo;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-auth-form]').forEach(wireAuthForm);
    document.querySelectorAll('[data-demo-portal]').forEach(wireDemoButton);
    document.querySelectorAll('[data-auth-logout]').forEach(wireLogoutButton);
  });

  globalScope.CaraAuth = {
    clearDemoMode,
    getDemoMode,
    getAccessToken,
    getSession,
    getSupabase,
    setDemoMode,
    signOut,
  };
})(window);
