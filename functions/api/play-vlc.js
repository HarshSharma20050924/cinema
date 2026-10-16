/**
 * Cloudflare Pages Function: /api/play-vlc
 * Clean handler for Cloudflare production when local companion is not directly reached.
 */
export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  return new Response(
    JSON.stringify({
      success: false,
      cloud: true,
      message: 'Cloudflare Pages edge cannot spawn local processes. Client will trigger native M3U stream handoff.',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    }
  );
}
