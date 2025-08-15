import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
  // Create HTML response that posts message to parent window
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Authentication</title>
      </head>
      <body>
        <script>
          const message = {
            type: 'auth-callback',
            provider: 'google-drive',
            ${code ? `code: '${code}'` : ''}
            ${error ? `error: '${error}'` : ''}
          };
          
          if (window.opener) {
            window.opener.postMessage(message, '${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}');
          }
          
          setTimeout(() => {
            window.close();
          }, 1000);
        </script>
        <div style="font-family: system-ui; text-align: center; padding: 50px;">
          ${error ? 
            '<h2>Authentication Failed</h2><p>Please try again.</p>' : 
            '<h2>Authentication Successful</h2><p>You can close this window.</p>'
          }
        </div>
      </body>
    </html>
  `
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}
