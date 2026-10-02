// W9-R3 — www.get4dk.com → permanent redirect to the apex host.
// One hop from HTTPS; preserves path + query string.
export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect('https://get4dk.com' + url.pathname + url.search, 308);
  },
};
