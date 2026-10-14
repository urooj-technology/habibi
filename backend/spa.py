from django.conf import settings
from django.http import HttpResponse


def spa_index(request, *args, **kwargs):
    """Serve the built React index.html so client-side routes work on reload."""
    index_path = settings.FRONTEND_BUILD_DIR / "index.html"
    try:
        html = index_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return HttpResponse(
            "<h1>Frontend is not built</h1>"
            "<p>Run <code>npm run build</code> inside the <code>frontend</code> folder "
            "(or <code>scripts\\windows\\build-frontend.bat</code>), then reload.</p>",
            status=503,
        )
    response = HttpResponse(html)
    response["Cache-Control"] = "no-cache"
    return response
