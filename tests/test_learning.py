"""Data provenance and row isolation tests for the educational API additions."""
import numpy as np
from fastapi.testclient import TestClient
from hehaoyang.webapp.server import app, data

client = TestClient(app)


def pair(role='development'):
    frame, catalog = data()
    row = frame[frame.role.eq(role)].iloc[0]
    return {
        'drug_id': next(d['id'] for d in catalog['Drug'] if d['smiles'] == row['Drug SMILES'] and d['name'] == row.Drug),
        'solvent_id': next(s['id'] for s in catalog['Solvent'] if s['smiles'] == row['Solvent SMILES'] and s['name'] == row.Solvent),
        'temperature': float(row.Temperature),
    }


def test_insights_report_actual_partition_without_reserved_labels():
    r = client.get('/api/insights')
    assert r.status_code == 200
    body = r.json()
    frame = data()[0]
    assert body['summary']['total_rows'] == len(frame) == 1904
    assert body['summary']['development_rows'] == 1507
    assert body['summary']['holdout_rows'] == 397
    assert body['summary']['development_parents'] == 128
    assert body['summary']['holdout_parents'] == 33
    assert body['summary']['drug_count'] == frame.Drug.nunique()
    assert body['summary']['drug_structure_count'] == frame['Drug SMILES'].nunique()
    assert body['protocol']['parent_overlap'] == 0
    assert body['protocol']['holdout_scored'] is False
    assert sum(b['count'] for b in body['temperature']['histogram']) == 1507
    assert len(body['models']) == 14
    solar = next(m for m in body['models'] if m['id'] == 'AdaptiveHybrid')
    assert solar['temperature_gain'] == 0
    assert body['source']['file'] == 'datasets/data_2026.csv'
    assert 'predictions' not in body
    assert 'observations' not in body


def test_evidence_matches_development_observations_and_detects_extrapolation():
    q = pair()
    body = client.get('/api/evidence', params=q).json()
    assert body['domain']['pair_seen'] is True
    assert body['domain']['parent_seen'] is True
    assert body['domain']['status'] == 'supported'
    assert body['support']['pair_rows'] == len(body['observations']) > 0
    assert any(np.isclose(r['temperature'], q['temperature']) for r in body['observations'])
    outside = client.get('/api/evidence', params=q | {'temperature': 999}).json()
    assert outside['domain']['status'] == 'temperature_extrapolation'
    assert outside['domain']['temperature_in_range'] is False


def test_evidence_never_exposes_reserved_outcomes():
    q = pair('reserved_holdout_unscored')
    body = client.get('/api/evidence', params=q).json()
    assert body['observations'] == []
    assert body['observations_scope'] == 'development_only'
    assert body['domain']['parent_seen'] is False
    assert body['domain']['status'] == 'unseen_parent'
    assert body['support']['drug_rows'] == 0
    assert client.get('/api/evidence', params=q | {'drug_id': 'missing'}).status_code == 422
    assert client.get('/api/evidence', params=q | {'temperature': 'nan'}).status_code == 422


def test_batch_isolates_invalid_rows_and_matches_single_prediction():
    valid = pair()
    q = {'model_id': 'Dummy', 'rows': [valid, valid | {'drug_id': 'missing'}, valid | {'temperature': 'bad'}, valid]}
    r = client.post('/api/batch', json=q)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body['success_count'] == 2 and body['error_count'] == 2
    assert [row['status'] for row in body['results']] == ['ok', 'error', 'error', 'ok']
    single = client.post('/api/predict', json=valid | {'model_id': 'Dummy'}).json()
    assert body['results'][0]['log_solubility'] == single['log_solubility']
    assert body['results'][3]['row'] == 4
    assert client.post('/api/batch', json=q | {'model_id': 'missing'}).status_code == 422
    assert client.post('/api/batch', json=q | {'rows': []}).status_code == 422
    assert client.post('/api/batch', json=q | {'rows': [valid] * 101}).status_code == 422
