"""
Response Template Engine - SQL/Query templates for company responses
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ResponseTemplate:
    """Template for generating response queries"""
    request_type: str
    provider_category: str
    sql_template: str
    column_mapping: Dict[str, str]  # CSV column -> Canonical field
    validation_rules: List[Dict]
    expected_columns: List[str]
    description: str
    example_output: str


# ==========================================
# RESPONSE TEMPLATE REGISTRY
# ==========================================

RESPONSE_TEMPLATES: Dict[str, ResponseTemplate] = {
    # ========== BANK TEMPLATES ==========
    "BANK_ACCOUNT_DETAILS": ResponseTemplate(
        request_type="BANK_ACCOUNT_DETAILS",
        provider_category="BANK",
        sql_template="""
-- Bank Statement Query Template
SELECT 
    transaction_date,
    transaction_id,
    description,
    debit_amount,
    credit_amount,
    balance,
    reference_number,
    transaction_type,
    beneficiary_name,
    beneficiary_account,
    beneficiary_ifsc
FROM transactions
WHERE account_number = '{account_number}'
  AND transaction_date BETWEEN '{start_date}' AND '{end_date}'
ORDER BY transaction_date DESC;
        """,
        column_mapping={
            "transaction_date": "date",
            "transaction_id": "txn_id",
            "description": "narration",
            "debit_amount": "debit",
            "credit_amount": "credit",
            "balance": "closing_balance",
            "reference_number": "ref_no",
            "transaction_type": "type",
            "beneficiary_name": "beneficiary",
            "beneficiary_account": "beneficiary_account_no",
            "beneficiary_ifsc": "ifsc_code"
        },
        validation_rules=[
            {
                "field": "transaction_date",
                "rule": "date_range",
                "message": "Date must be within requested range"
            },
            {
                "field": "account_number",
                "rule": "matches_request",
                "message": "Account number must match request"
            },
            {
                "field": "debit_amount",
                "rule": "numeric",
                "message": "Debit amount must be numeric"
            },
            {
                "field": "credit_amount",
                "rule": "numeric",
                "message": "Credit amount must be numeric"
            }
        ],
        expected_columns=[
            "transaction_date", "transaction_id", "description",
            "debit_amount", "credit_amount", "balance", "reference_number"
        ],
        description="6-month bank statement with transaction details",
        example_output="CSV with 10-12 columns, ~100-500 rows per month"
    ),
    
    "BANK_KYC": ResponseTemplate(
        request_type="BANK_KYC",
        provider_category="BANK",
        sql_template="""
-- Bank KYC Query Template
SELECT
    account_number,
    account_holder_name,
    date_of_birth,
    pan_number,
    aadhaar_number,
    mobile_number,
    email_address,
    address_line1,
    address_line2,
    city,
    state,
    pincode,
    account_opening_date,
    account_status,
    account_type,
    branch_name,
    branch_ifsc
FROM customer_accounts
WHERE account_number = '{account_number}';
        """,
        column_mapping={
            "account_number": "account_no",
            "account_holder_name": "name",
            "date_of_birth": "dob",
            "pan_number": "pan",
            "aadhaar_number": "aadhaar",
            "mobile_number": "phone",
            "email_address": "email"
        },
        validation_rules=[
            {
                "field": "account_number",
                "rule": "matches_request",
                "message": "Account number must match"
            },
            {
                "field": "pan_number",
                "rule": "format",
                "pattern": "[A-Z]{5}[0-9]{4}[A-Z]{1}",
                "message": "Invalid PAN format"
            }
        ],
        expected_columns=[
            "account_number", "account_holder_name", "pan_number",
            "mobile_number", "address_line1", "city", "state"
        ],
        description="Account holder KYC details",
        example_output="PDF or single-row CSV with KYC data"
    ),
    
    # ========== TELECOM TEMPLATES ==========
    "TELECOM_CDR": ResponseTemplate(
        request_type="TELECOM_CDR",
        provider_category="TELECOM",
        sql_template="""
-- CDR Query Template
SELECT
    call_date,
    call_time,
    call_type,  -- VOICE, SMS, DATA
    calling_number,
    called_number,
    duration_seconds,
    call_status,  -- CONNECTED, MISSED, REJECTED
    cell_id,
    location_name,
    latitude,
    longitude,
    imei_number
FROM call_detail_records
WHERE calling_number = '{phone_number}'
   OR called_number = '{phone_number}'
AND call_date BETWEEN '{start_date}' AND '{end_date}'
ORDER BY call_date, call_time;
        """,
        column_mapping={
            "call_date": "date",
            "call_time": "time",
            "call_type": "type",
            "calling_number": "a_party",
            "called_number": "b_party",
            "duration_seconds": "duration",
            "call_status": "status",
            "cell_id": "tower_id",
            "location_name": "location"
        },
        validation_rules=[
            {
                "field": "call_date",
                "rule": "date_range",
                "message": "Date must be within requested range"
            },
            {
                "field": "phone_number",
                "rule": "matches_request",
                "message": "Phone number must match request"
            },
            {
                "field": "duration_seconds",
                "rule": "numeric",
                "message": "Duration must be numeric"
            }
        ],
        expected_columns=[
            "call_date", "call_time", "call_type", "calling_number",
            "called_number", "duration_seconds", "cell_id"
        ],
        description="Call Detail Records (Voice, SMS, Data)",
        example_output="CSV with 10-15 columns, ~500-2000 rows per month"
    ),
    
    "SIM_KYC": ResponseTemplate(
        request_type="SIM_KYC",
        provider_category="TELECOM",
        sql_template="""
-- SIM KYC Query Template
SELECT
    phone_number,
    subscriber_name,
    date_of_birth,
    aadhaar_number,
    alternate_mobile,
    email_address,
    address_line1,
    address_line2,
    city,
    state,
    pincode,
    activation_date,
    status,
    sim_serial_number,
    imei_history
FROM subscriber_details
WHERE phone_number = '{phone_number}';
        """,
        column_mapping={
            "phone_number": "mobile_no",
            "subscriber_name": "name",
            "aadhaar_number": "aadhaar",
            "activation_date": "activation",
            "sim_serial_number": "sim_no"
        },
        validation_rules=[
            {
                "field": "phone_number",
                "rule": "matches_request",
                "message": "Phone number must match"
            }
        ],
        expected_columns=[
            "phone_number", "subscriber_name", "aadhaar_number",
            "activation_date", "status"
        ],
        description="SIM card registration and KYC details",
        example_output="PDF or single-row CSV"
    ),
    
    # ========== PAYMENT PROVIDER TEMPLATES ==========
    "UPI_TRANSACTION_HISTORY": ResponseTemplate(
        request_type="UPI_TRANSACTION_HISTORY",
        provider_category="PAYMENT",
        sql_template="""
-- UPI Transaction Query Template
SELECT
    transaction_date,
    transaction_time,
    transaction_id,
    upi_id,
    transaction_type,  -- DEBIT, CREDIT
    amount,
    beneficiary_upi,
    beneficiary_name,
    payer_upi,
    payer_name,
    transaction_status,
    reference_id,
    merchant_id,
    device_id,
    ip_address
FROM upi_transactions
WHERE (upi_id = '{upi_id}' OR beneficiary_upi = '{upi_id}' OR payer_upi = '{upi_id}')
  AND transaction_date BETWEEN '{start_date}' AND '{end_date}'
ORDER BY transaction_date, transaction_time;
        """,
        column_mapping={
            "transaction_date": "date",
            "transaction_time": "time",
            "transaction_id": "txn_id",
            "transaction_type": "type",
            "amount": "amount",
            "beneficiary_upi": "payee_vpa",
            "payer_upi": "payer_vpa"
        },
        validation_rules=[
            {
                "field": "transaction_date",
                "rule": "date_range",
                "message": "Date must be within requested range"
            },
            {
                "field": "amount",
                "rule": "numeric",
                "message": "Amount must be numeric"
            }
        ],
        expected_columns=[
            "transaction_date", "transaction_id", "upi_id",
            "amount", "beneficiary_upi", "transaction_status"
        ],
        description="UPI transaction history",
        example_output="CSV with 12-15 columns, ~100-500 rows per month"
    ),
    
    "WALLET_DETAILS": ResponseTemplate(
        request_type="WALLET_DETAILS",
        provider_category="PAYMENT",
        sql_template="""
-- Wallet Details Query Template
SELECT
    wallet_id,
    mobile_number,
    email_address,
    full_name,
    kyc_status,
    wallet_balance,
    account_status,
    registration_date,
    last_transaction_date,
    linked_bank_account,
    linked_bank_ifsc,
    pan_number,
    aadhaar_number
FROM wallet_accounts
WHERE wallet_id = '{wallet_id}' OR mobile_number = '{mobile_number}';
        """,
        column_mapping={
            "wallet_id": "wallet",
            "mobile_number": "phone",
            "full_name": "name",
            "wallet_balance": "balance",
            "linked_bank_account": "bank_account"
        },
        validation_rules=[],
        expected_columns=[
            "wallet_id", "mobile_number", "full_name",
            "wallet_balance", "kyc_status"
        ],
        description="Wallet account details and balance",
        example_output="Single-row CSV or JSON"
    ),
}


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def get_template(request_type: str) -> Optional[ResponseTemplate]:
    """Get response template by request type"""
    return RESPONSE_TEMPLATES.get(request_type)


def generate_query(request_type: str, parameters: Dict[str, str]) -> Optional[str]:
    """
    Generate SQL query from template with parameters.
    
    Args:
        request_type: Type of request (e.g., 'BANK_ACCOUNT_DETAILS')
        parameters: Dict with values like {
            'account_number': '1234567890',
            'start_date': '2024-01-01',
            'end_date': '2024-06-30'
        }
    
    Returns:
        Formatted SQL query or None
    """
    template = get_template(request_type)
    if not template:
        return None
    
    try:
        query = template.sql_template.format(**parameters)
        return query
    except KeyError as e:
        print(f"Missing parameter: {e}")
        return None


def validate_response_data(request_type: str, data: List[Dict]) -> Dict:
    """
    Validate response data against template rules.
    
    Returns:
        {
            'valid': True/False,
            'errors': [...],
            'warnings': [...]
        }
    """
    template = get_template(request_type)
    if not template:
        return {
            'valid': False,
            'errors': [f'Unknown request type: {request_type}'],
            'warnings': []
        }
    
    errors = []
    warnings = []
    
    # Check if data is empty
    if not data:
        errors.append('No data provided')
        return {'valid': False, 'errors': errors, 'warnings': warnings}
    
    # Check expected columns
    first_row = data[0]
    missing_columns = [col for col in template.expected_columns if col not in first_row]
    if missing_columns:
        warnings.append(f'Missing columns: {", ".join(missing_columns)}')
    
    # Validate each row
    for idx, row in enumerate(data[:100]):  # Validate first 100 rows
        for rule in template.validation_rules:
            field = rule['field']
            if field not in row:
                continue
            
            value = row[field]
            
            if rule['rule'] == 'numeric':
                try:
                    float(value)
                except (ValueError, TypeError):
                    errors.append(f'Row {idx+1}: {field} is not numeric')
            
            elif rule['rule'] == 'date_range':
                # Would check if date is in range
                pass
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }


def get_all_templates() -> List[ResponseTemplate]:
    """Get all available templates"""
    return list(RESPONSE_TEMPLATES.values())

