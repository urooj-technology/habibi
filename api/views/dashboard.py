"""Home dashboard API."""

from rest_framework.permissions import IsAuthenticated
from account.permissions import HasPerm
from rest_framework.response import Response
from rest_framework.views import APIView

from api.services.dashboard import build_daily_ops_dashboard


class DailyOpsDashboardAPIView(APIView):
    permission_classes = [HasPerm("dashboard.view")]

    def get(self, request):
        currency = (request.query_params.get("currency") or "AFN").upper()
        if currency not in ("AFN", "USD"):
            currency = "AFN"
        try:
            days = int(request.query_params.get("days") or 14)
        except (TypeError, ValueError):
            days = 14
        return Response(build_daily_ops_dashboard(currency=currency, days=days))
