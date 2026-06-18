"""Tests for summary_worker embedding persistence."""
from unittest.mock import MagicMock, patch

from app.workers import summary_worker as sw


@patch("sqlalchemy.create_engine")
@patch("app.config.get_settings")
def test_save_embedding_uses_sqlalchemy_cast_not_pg_operator(mock_get_settings, mock_create_engine):
    mock_get_settings.return_value.database_url = "postgresql+asyncpg://user:pass@localhost/db"

    mock_conn = MagicMock()
    mock_ctx = MagicMock()
    mock_ctx.__enter__.return_value = mock_conn
    mock_ctx.__exit__.return_value = False
    mock_engine = MagicMock()
    mock_engine.begin.return_value = mock_ctx
    mock_create_engine.return_value = mock_engine

    sw._save_embedding("doc-test-001", [0.1, 0.2, 0.3])

    mock_create_engine.assert_called_once_with(
        "postgresql+psycopg2://user:pass@localhost/db",
        pool_pre_ping=True,
    )
    mock_conn.execute.assert_called_once()
    sql_obj, params = mock_conn.execute.call_args[0]
    sql_str = str(sql_obj)
    assert ":emb::vector" not in sql_str
    assert "CAST(:emb AS vector)" in sql_str
    assert params["doc_id"] == "doc-test-001"
    assert params["emb"] == "[0.1,0.2,0.3]"
    assert "ts" in params
