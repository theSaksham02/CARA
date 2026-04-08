'use strict';

const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

function getAuthMode() {
  if (process.env.AUTH_MODE) {
    return process.env.AUTH_MODE;
  }

  return process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY ? 'supabase' : 'bypass';
}

function getBearerToken(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice('Bearer '.length).trim();
}

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Supabase auth is enabled but SUPABASE_URL or SUPABASE_ANON_KEY is missing.');
  }

  supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
}

function mapAuthenticatedUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.app_metadata?.role || user.user_metadata?.role || 'user',
    patient_id: user.app_metadata?.patient_id || user.user_metadata?.patient_id || null,
  };
}

async function authMiddleware(req, res, next) {
  if (getAuthMode() === 'bypass') {
    req.user = {
      id: 'dev-user',
      role: 'developer',
      email: 'dev@cara.local',
      patient_id: null,
    };
    return next();
  }

  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({
      error: 'Missing bearer token.',
    });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: 'Invalid Supabase JWT.',
      });
    }

    req.user = mapAuthenticatedUser(data.user);

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  authMiddleware,
  getAuthMode,
  mapAuthenticatedUser,
};
