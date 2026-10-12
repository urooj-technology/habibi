"""API: convert GL accounts or contact AR/AP between AFN and USD."""

from datetime import date, datetime

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from account.permissions import ModuleCRUDPermission
from rest_framework.response import Response
from rest_framework.views import APIView

from api.services.accounting.currency_conversion import (
    post_account_currency_conversion,
    post_contact_currency_conversion,
)


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    text = str(value).strip()[:10]
    return date.fromisoformat(text)


class CurrencyConversionAPIView(APIView):
    permission_classes = [ModuleCRUDPermission("accounting")]

    def post(self, request):
        data = request.data or {}
        kind = (data.get("kind") or "account").strip().lower()
        entry_date = None
        try:
            entry_date = _parse_date(data.get("entry_date"))
        except ValueError:
            return Response(
                {"error": "Invalid entry_date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if kind == "account":
                try:
                    from_account_id = int(data.get("from_account_id") or data.get("from_account"))
                    to_account_id = int(data.get("to_account_id") or data.get("to_account"))
                except (TypeError, ValueError):
                    return Response(
                        {"error": "from_account_id and to_account_id are required."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                entry = post_account_currency_conversion(
                    from_account_id=from_account_id,
                    to_account_id=to_account_id,
                    amount=data.get("amount"),
                    exchange_rate=data.get("exchange_rate"),
                    entry_date=entry_date,
                    memo=data.get("memo") or "",
                    created_by=request.user,
                )
            elif kind in ("customer", "supplier"):
                try:
                    contact_id = int(data.get("contact_id"))
                except (TypeError, ValueError):
                    return Response(
                        {"error": "contact_id is required."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                entry = post_contact_currency_conversion(
                    kind=kind,
                    contact_id=contact_id,
                    from_currency=data.get("from_currency"),
                    to_currency=data.get("to_currency"),
                    amount=data.get("amount"),
                    exchange_rate=data.get("exchange_rate"),
                    entry_date=entry_date,
                    memo=data.get("memo") or "",
                    created_by=request.user,
                )
            else:
                return Response(
                    {"error": "kind must be account, customer, or supplier."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (TypeError, ValueError) as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response(
                {"error": str(exc) or "Currency conversion failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail": "Currency conversion posted.",
                "journal_entry_id": entry.pk,
                "reference": entry.reference,
                "entry_date": str(entry.entry_date),
                "memo": entry.memo,
                "kind": kind,
            },
            status=status.HTTP_201_CREATED,
        )
