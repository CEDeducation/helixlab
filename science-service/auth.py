"""Constant-time bearer-token authorization for the separate science service."""
from __future__ import annotations
import hmac
import os
from fastapi import Header, HTTPException


def authorize(x_helix_token: str | None = Header(default=None)) -> None:
    """Require server-to-server secret; browsers never receive this token."""
    secret = os.environ.get('SCIENCE_SERVICE_SECRET', '')
    if len(secret) < 24:
        raise HTTPException(503, 'Science service secret is missing or too short')
    if not x_helix_token or not hmac.compare_digest(x_helix_token, secret):
        raise HTTPException(401, 'Unauthorized')
