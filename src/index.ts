export default {
	async fetch(request): Promise<Response> {
		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
			"Access-Control-Max-Age": "86400",
		};

		// The URL for the remote third party API you want to fetch from
		// but does not implement CORS
		const API_URL = "https://examples.cloudflareworkers.com/demos/demoapi";

		// The endpoint you want the CORS reverse proxy to be on
		const PROXY_ENDPOINT = "/corsproxy/";

		// The rest of this snippet for the demo page
		function rawHtmlResponse(html) {
			return new Response(html, {
				headers: {
					"content-type": "text/html;charset=UTF-8",
				},
			});
		}

		const DEMO_PAGE = `
      <!DOCTYPE html>
      <html>
      <body>
        <h1>API GET without CORS Proxy</h1>
        <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#Checking_that_the_fetch_was_successful">Shows TypeError: Failed to fetch since CORS is misconfigured</a>
        <p id="noproxy-status"/>
        <code id="noproxy">Waiting</code>
        <h1>API GET with CORS Proxy</h1>
        <p id="proxy-status"/>
        <code id="proxy">Waiting</code>
        <h1>API POST with CORS Proxy + Preflight</h1>
        <p id="proxypreflight-status"/>
        <code id="proxypreflight">Waiting</code>
        <script>
        let reqs = {};
        reqs.noproxy = () => {
          return fetch("${API_URL}").then(r => r.json())
        }
        reqs.proxy = async () => {
          let href = "${PROXY_ENDPOINT}?apiurl=${API_URL}"
          return fetch(window.location.origin + href).then(r => r.json())
        }
        reqs.proxypreflight = async () => {
          let href = "${PROXY_ENDPOINT}?apiurl=${API_URL}"
          let response = await fetch(window.location.origin + href, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              msg: "Hello world!"
            })
          })
          return response.json()
        }
        (async () => {
        for (const [reqName, req] of Object.entries(reqs)) {
          try {
            let data = await req()
            document.getElementById(reqName).textContent = JSON.stringify(data)
          } catch (e) {
            document.getElementById(reqName).textContent = e
          }
        }
      })()
        </script>
      </body>
      </html>
    `;

		async function handleRequest(request) {
		  const url = new URL(request.url);
		  const apiUrl = url.searchParams.get("apiurl");
		
		  if (!apiUrl) {
		    return new Response("Missing apiurl", { status: 400 });
		  }
		
		  const newHeaders = new Headers(request.headers);
		
		  const upstream = await fetch(apiUrl, {
		    method: request.method,
		    headers: newHeaders
		  });
		
		  const headers = new Headers(upstream.headers);
		
		  headers.set("Access-Control-Allow-Origin", "*");
		  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
		  headers.set("Access-Control-Allow-Headers", "*");
		
		  return new Response(upstream.body, {
		    status: upstream.status,
		    statusText: upstream.statusText,
		    headers
		  });
		}

		async function handleOptions(request) {
			if (
				request.headers.get("Origin") !== null &&
				request.headers.get("Access-Control-Request-Method") !== null &&
				request.headers.get("Access-Control-Request-Headers") !== null
			) {
				// Handle CORS preflight requests.
				return new Response(null, {
					headers: {
						...corsHeaders,
						"Access-Control-Allow-Headers": request.headers.get(
							"Access-Control-Request-Headers",
						),
					},
				});
			} else {
				// Handle standard OPTIONS request.
				return new Response(null, {
					headers: {
						Allow: "GET, HEAD, POST, OPTIONS",
					},
				});
			}
		}

		const url = new URL(request.url);
		if (url.pathname.startsWith(PROXY_ENDPOINT)) {
			if (request.method === "OPTIONS") {
				// Handle CORS preflight requests
				return handleOptions(request);
			} else if (
				request.method === "GET" ||
				request.method === "HEAD" ||
				request.method === "POST"
			) {
				// Handle requests to the API server
				return handleRequest(request);
			} else {
				return new Response(null, {
					status: 405,
					statusText: "Method Not Allowed",
				});
			}
		} else {
			return rawHtmlResponse(DEMO_PAGE);
		}
	},
} satisfies ExportedHandler;
