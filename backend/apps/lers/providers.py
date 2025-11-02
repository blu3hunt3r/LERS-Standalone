"""
Provider Registry System - Defines capabilities, SLA, and integration types for each provider.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class IntegrationType(str, Enum):
    """How the provider integrates with our system"""
    API = "API"  # Real-time API integration
    WEBHOOK = "WEBHOOK"  # Webhook-based async
    SFTP = "SFTP"  # SFTP file transfer
    EMAIL = "EMAIL"  # Email-based manual
    PORTAL = "PORTAL"  # Provider's web portal
    MANUAL = "MANUAL"  # Completely manual process


class DocumentRequirement(str, Enum):
    """Legal documents required for requests"""
    COURT_ORDER = "COURT_ORDER"
    FIR_COPY = "FIR_COPY"
    MAGISTRATE_ORDER = "MAGISTRATE_ORDER"
    SUPERINTENDENT_APPROVAL = "SUPERINTENDENT_APPROVAL"
    WARRANT = "WARRANT"


@dataclass
class DataPoint:
    """Specific data point that can be requested"""
    field_name: str
    display_name: str
    required: bool
    field_type: str  # TEXT, DATE, DATE_RANGE, NUMBER, BOOLEAN, FILE
    description: str
    default_value: Optional[str] = None
    validation_rule: Optional[str] = None
    help_text: Optional[str] = None


@dataclass
class RequestTypeCapability:
    """Capability for a specific request type"""
    request_type: str
    display_name: str
    integration_type: IntegrationType
    sla_hours: int
    required_documents: List[DocumentRequirement]
    auto_fillable: bool
    description: str
    typical_response_format: str  # CSV, PDF, JSON, etc.
    data_points: List[DataPoint] = None
    estimated_cost: Optional[float] = None
    
    def __post_init__(self):
        if self.data_points is None:
            self.data_points = []


@dataclass
class Provider:
    """Provider configuration"""
    provider_id: str
    name: str
    category: str  # BANK, TELECOM, PAYMENT, SOCIAL_MEDIA, etc.
    logo_url: Optional[str] = None
    contact_email: Optional[str] = None
    portal_url: Optional[str] = None
    capabilities: List[RequestTypeCapability] = None
    
    def __post_init__(self):
        if self.capabilities is None:
            self.capabilities = []


# ==========================================
# PROVIDER REGISTRY DATABASE
# ==========================================

PROVIDERS_REGISTRY: Dict[str, Provider] = {
    # ========== BANKS ==========
    "ICICI_BANK": Provider(
        provider_id="ICICI_BANK",
        name="ICICI Bank",
        category="BANK",
        logo_url="/logos/icici.png",
        contact_email="cybercrime@icicibank.com",
        portal_url="https://cybercrime.icicibank.com",
        capabilities=[
            RequestTypeCapability(
                request_type="BANK_ACCOUNT_DETAILS",
                display_name="Bank Account Statements",
                integration_type=IntegrationType.API,
                sla_hours=4,
                required_documents=[DocumentRequirement.COURT_ORDER, DocumentRequirement.FIR_COPY],
                auto_fillable=True,
                description="6-month transaction history with KYC details",
                typical_response_format="CSV",
                data_points=[
                    DataPoint("account_number", "Account Number", required=True, field_type="TEXT", 
                              description="Bank account number to be investigated",
                              validation_rule="^[0-9]{9,18}$",
                              help_text="Enter 9-18 digit account number"),
                    DataPoint("ifsc_code", "IFSC Code", required=False, field_type="TEXT",
                              description="Bank branch IFSC code (if known)",
                              validation_rule="^[A-Z]{4}0[A-Z0-9]{6}$",
                              help_text="11-character IFSC code (e.g., ICIC0001234)"),
                    DataPoint("date_range", "Statement Period", required=True, field_type="DATE_RANGE",
                              description="Date range for transaction history",
                              help_text="Maximum 6 months from fraud date"),
                    DataPoint("include_kyc", "Include KYC Documents", required=False, field_type="BOOLEAN",
                              description="Include account holder KYC details",
                              default_value="true"),
                    DataPoint("include_images", "Include Cheque/Slip Images", required=False, field_type="BOOLEAN",
                              description="Include scanned images of cheques and deposit slips",
                              default_value="false"),
                    DataPoint("transaction_threshold", "Transaction Amount Filter", required=False, field_type="NUMBER",
                              description="Only include transactions above this amount (in INR)",
                              help_text="Leave empty for all transactions"),
                ],
            ),
            RequestTypeCapability(
                request_type="KYC_DOCUMENTS",
                display_name="Account KYC Documents",
                integration_type=IntegrationType.API,
                sla_hours=2,
                required_documents=[DocumentRequirement.COURT_ORDER],
                auto_fillable=True,
                description="Account holder KYC, PAN, Aadhaar, address",
                typical_response_format="PDF",
                data_points=[
                    DataPoint("account_number", "Account Number", required=True, field_type="TEXT",
                              description="Account number for KYC retrieval",
                              validation_rule="^[0-9]{9,18}$"),
                    DataPoint("include_pan", "Include PAN Card", required=False, field_type="BOOLEAN",
                              description="Include PAN card details",
                              default_value="true"),
                    DataPoint("include_aadhaar", "Include Aadhaar Details", required=False, field_type="BOOLEAN",
                              description="Include Aadhaar verification details (masked)",
                              default_value="true"),
                    DataPoint("include_address_proof", "Include Address Proof", required=False, field_type="BOOLEAN",
                              description="Include submitted address proof documents",
                              default_value="true"),
                    DataPoint("include_signature", "Include Signature Specimen", required=False, field_type="BOOLEAN",
                              description="Include account holder's signature specimen",
                              default_value="false"),
                ],
            ),
            RequestTypeCapability(
                request_type="BANK_TX_HISTORY",
                display_name="Beneficiary Transaction Chain",
                integration_type=IntegrationType.MANUAL,
                sla_hours=72,
                required_documents=[DocumentRequirement.COURT_ORDER, DocumentRequirement.SUPERINTENDENT_APPROVAL],
                auto_fillable=True,
                description="Money trail for beneficiary accounts",
                typical_response_format="CSV",
                data_points=[
                    DataPoint("source_account", "Source Account Number", required=True, field_type="TEXT",
                              description="Primary account number to trace from",
                              validation_rule="^[0-9]{9,18}$"),
                    DataPoint("date_range", "Transaction Period", required=True, field_type="DATE_RANGE",
                              description="Period to trace beneficiary chain"),
                    DataPoint("chain_depth", "Chain Depth Levels", required=False, field_type="NUMBER",
                              description="How many levels of beneficiary to trace (1-5)",
                              default_value="2",
                              help_text="Level 1 = direct beneficiaries, Level 2 = secondary transfers"),
                    DataPoint("min_amount", "Minimum Transaction Amount", required=False, field_type="NUMBER",
                              description="Only trace transactions above this amount (INR)",
                              default_value="10000"),
                    DataPoint("include_upi", "Include UPI Beneficiaries", required=False, field_type="BOOLEAN",
                              description="Include UPI/IMPS beneficiary accounts",
                              default_value="true"),
                ],
            ),
        ]
    ),
    
    "HDFC_BANK": Provider(
        provider_id="HDFC_BANK",
        name="HDFC Bank",
        category="BANK",
        contact_email="lawenforcement@hdfcbank.com",
        capabilities=[
            RequestTypeCapability(
                request_type="BANK_ACCOUNT_DETAILS",
                display_name="Account Statements",
                integration_type=IntegrationType.EMAIL,
                sla_hours=48,
                required_documents=[DocumentRequirement.COURT_ORDER],
                auto_fillable=True,
                description="Transaction history",
                typical_response_format="PDF",
                data_points=[
                    DataPoint("account_number", "Account Number", required=True, field_type="TEXT",
                              description="Account number to retrieve statements for"),
                    DataPoint("date_range", "Statement Period", required=True, field_type="DATE_RANGE",
                              description="Date range for transaction history"),
                    DataPoint("include_kyc", "Include KYC", required=False, field_type="BOOLEAN",
                              description="Include KYC documents", default_value="true"),
                ],
            ),
        ]
    ),
    
    "SBI": Provider(
        provider_id="SBI",
        name="State Bank of India",
        category="BANK",
        contact_email="cybercell@sbi.co.in",
        capabilities=[
            RequestTypeCapability(
                request_type="BANK_ACCOUNT_DETAILS",
                display_name="Account Statements",
                integration_type=IntegrationType.PORTAL,
                sla_hours=96,
                required_documents=[DocumentRequirement.COURT_ORDER],
                auto_fillable=False,
                description="Manual portal submission required",
                typical_response_format="PDF",
                data_points=[
                    DataPoint("account_number", "Account Number", required=True, field_type="TEXT",
                              description="SBI account number"),
                    DataPoint("date_range", "Statement Period", required=True, field_type="DATE_RANGE",
                              description="Date range for statements"),
                    DataPoint("branch_code", "Branch Code", required=False, field_type="TEXT",
                              description="SBI branch code if known"),
                ],
            ),
        ]
    ),
    
    # ========== TELECOM ==========
    "AIRTEL": Provider(
        provider_id="AIRTEL",
        name="Bharti Airtel",
        category="TELECOM",
        logo_url="/logos/airtel.png",
        contact_email="leo@airtel.com",
        portal_url="https://leo.airtel.com",
        capabilities=[
            RequestTypeCapability(
                request_type="CDR",
                display_name="Call Detail Records (CDR)",
                integration_type=IntegrationType.API,
                sla_hours=6,
                required_documents=[DocumentRequirement.COURT_ORDER],
                auto_fillable=True,
                description="Voice, SMS, and data session logs",
                typical_response_format="CSV",
                data_points=[
                    DataPoint("phone_number", "Mobile Number", required=True, field_type="TEXT",
                              description="10-digit mobile number",
                              validation_rule="^[6-9][0-9]{9}$",
                              help_text="Indian mobile number (e.g., 9876543210)"),
                    DataPoint("date_range", "CDR Period", required=True, field_type="DATE_RANGE",
                              description="Period for CDR extraction",
                              help_text="Maximum 6 months"),
                    DataPoint("include_voice", "Include Voice Calls", required=False, field_type="BOOLEAN",
                              description="Include incoming/outgoing call records",
                              default_value="true"),
                    DataPoint("include_sms", "Include SMS", required=False, field_type="BOOLEAN",
                              description="Include SMS records",
                              default_value="true"),
                    DataPoint("include_data", "Include Data Sessions", required=False, field_type="BOOLEAN",
                              description="Include internet/data usage logs",
                              default_value="false"),
                    DataPoint("tower_info", "Include Tower Information", required=False, field_type="BOOLEAN",
                              description="Include cell tower IDs and locations",
                              default_value="true"),
                ],
            ),
            RequestTypeCapability(
                request_type="SIM_DETAILS",
                display_name="SIM Card KYC",
                integration_type=IntegrationType.MANUAL,
                sla_hours=24,
                required_documents=[DocumentRequirement.FIR_COPY],
                auto_fillable=True,
                description="SIM issuance details and subscriber KYC",
                typical_response_format="PDF",
                data_points=[
                    DataPoint("phone_number", "Mobile Number", required=True, field_type="TEXT",
                              description="Mobile number for KYC retrieval",
                              validation_rule="^[6-9][0-9]{9}$"),
                    DataPoint("activation_date_range", "Suspected Activation Period", required=False, field_type="DATE_RANGE",
                              description="If activation date is unknown, provide estimated range"),
                    DataPoint("include_documents", "Include Submitted Documents", required=False, field_type="BOOLEAN",
                              description="Include copies of ID proofs submitted at activation",
                              default_value="true"),
                    DataPoint("include_retailer", "Include Retailer Details", required=False, field_type="BOOLEAN",
                              description="Include details of retailer who issued SIM",
                              default_value="true"),
                ],
            ),
            RequestTypeCapability(
                request_type="IP_LOGS",
                display_name="Cell Tower Location History",
                integration_type=IntegrationType.MANUAL,
                sla_hours=48,
                required_documents=[DocumentRequirement.COURT_ORDER],
                auto_fillable=True,
                description="Tower-wise location data",
                typical_response_format="CSV",
                data_points=[
                    DataPoint("phone_number", "Mobile Number", required=True, field_type="TEXT",
                              description="Mobile number to track",
                              validation_rule="^[6-9][0-9]{9}$"),
                    DataPoint("date_range", "Tracking Period", required=True, field_type="DATE_RANGE",
                              description="Period for location tracking"),
                    DataPoint("geo_fence", "Geo-Fence Area", required=False, field_type="TEXT",
                              description="Specific area coordinates (if location-based query)",
                              help_text="Format: lat1,lon1;lat2,lon2 (bounding box)"),
                    DataPoint("time_granularity", "Time Granularity", required=False, field_type="TEXT",
                              description="Hourly or full logs",
                              default_value="full"),
                ],
            ),
        ]
    ),
    
    "JIO": Provider(
        provider_id="JIO",
        name="Reliance Jio",
        category="TELECOM",
        contact_email="leo@jio.com",
        capabilities=[
            RequestTypeCapability(
                request_type="CDR",
                display_name="CDR Records",
                integration_type=IntegrationType.API,
                sla_hours=4,
                required_documents=[DocumentRequirement.COURT_ORDER],
                auto_fillable=True,
                description="Call, SMS, data logs",
                typical_response_format="CSV",
                data_points=[
                    DataPoint("phone_number", "Mobile Number", required=True, field_type="TEXT",
                              description="Jio mobile number", validation_rule="^[6-9][0-9]{9}$"),
                    DataPoint("date_range", "CDR Period", required=True, field_type="DATE_RANGE",
                              description="Period for CDR extraction"),
                    DataPoint("include_voice", "Voice Calls", required=False, field_type="BOOLEAN", 
                              description="Include voice call records", default_value="true"),
                    DataPoint("include_sms", "SMS", required=False, field_type="BOOLEAN", 
                              description="Include SMS records", default_value="true"),
                    DataPoint("include_data", "Data Sessions", required=False, field_type="BOOLEAN", 
                              description="Include data session logs", default_value="true"),
                ],
            ),
        ]
    ),
    
    "VI": Provider(
        provider_id="VI",
        name="Vodafone Idea (Vi)",
        category="TELECOM",
        contact_email="leo@myvi.in",
        capabilities=[
            RequestTypeCapability(
                request_type="CDR",
                display_name="CDR Records",
                integration_type=IntegrationType.EMAIL,
                sla_hours=72,
                required_documents=[DocumentRequirement.COURT_ORDER],
                auto_fillable=True,
                description="Call and SMS records",
                typical_response_format="PDF",
                data_points=[
                    DataPoint("phone_number", "Mobile Number", required=True, field_type="TEXT",
                              description="Vi mobile number", validation_rule="^[6-9][0-9]{9}$"),
                    DataPoint("date_range", "CDR Period", required=True, field_type="DATE_RANGE",
                              description="Period for CDR extraction"),
                ],
            ),
        ]
    ),
    
    # ========== PAYMENT PROVIDERS ==========
    "PAYTM": Provider(
        provider_id="PAYTM",
        name="Paytm",
        category="PAYMENT",
        logo_url="/logos/paytm.png",
        contact_email="legal@paytm.com",
        portal_url="https://leo.paytm.com",
        capabilities=[
            RequestTypeCapability(
                request_type="UPI_TX",
                display_name="UPI Transaction Logs",
                integration_type=IntegrationType.WEBHOOK,
                sla_hours=8,
                required_documents=[DocumentRequirement.COURT_ORDER],
                auto_fillable=True,
                description="UPI transaction history and wallet details",
                typical_response_format="JSON",
                data_points=[
                    DataPoint("upi_id", "UPI ID / Mobile", required=True, field_type="TEXT",
                              description="Paytm UPI ID or registered mobile number",
                              help_text="e.g., 9876543210@paytm or 9876543210"),
                    DataPoint("date_range", "Transaction Period", required=True, field_type="DATE_RANGE",
                              description="Date range for transaction history"),
                    DataPoint("include_wallet", "Include Wallet Transactions", required=False, field_type="BOOLEAN",
                              description="Include Paytm wallet transactions",
                              default_value="true"),
                    DataPoint("min_amount", "Minimum Amount Filter", required=False, field_type="NUMBER",
                              description="Only include transactions above this amount (INR)"),
                ],
            ),
            RequestTypeCapability(
                request_type="WALLET_DETAILS",
                display_name="Wallet KYC & Balance",
                integration_type=IntegrationType.API,
                sla_hours=4,
                required_documents=[DocumentRequirement.FIR_COPY],
                auto_fillable=True,
                description="Wallet balance, KYC, linked accounts",
                typical_response_format="JSON",
                data_points=[
                    DataPoint("mobile_number", "Registered Mobile", required=True, field_type="TEXT",
                              description="Mobile number linked to Paytm account",
                              validation_rule="^[6-9][0-9]{9}$"),
                    DataPoint("include_linked_accounts", "Linked Bank Accounts", required=False, field_type="BOOLEAN",
                              description="Include linked bank account details",
                              default_value="true"),
                    DataPoint("include_kyc", "KYC Documents", required=False, field_type="BOOLEAN",
                              description="Include KYC verification documents",
                              default_value="true"),
                ],
            ),
        ]
    ),
    
    "PHONEPE": Provider(
        provider_id="PHONEPE",
        name="PhonePe",
        category="PAYMENT",
        contact_email="leo@phonepe.com",
        capabilities=[
            RequestTypeCapability(
                request_type="UPI_TX",
                display_name="UPI Transactions",
                integration_type=IntegrationType.API,
                sla_hours=6,
                required_documents=[DocumentRequirement.COURT_ORDER],
                auto_fillable=True,
                description="UPI transaction logs",
                typical_response_format="CSV",
                data_points=[
                    DataPoint("upi_id", "UPI ID / Mobile", required=True, field_type="TEXT",
                              description="PhonePe UPI ID or registered mobile",
                              help_text="e.g., 9876543210@ybl or 9876543210"),
                    DataPoint("date_range", "Transaction Period", required=True, field_type="DATE_RANGE",
                              description="Date range for transactions"),
                ],
            ),
        ]
    ),
    
    "GOOGLE_PAY": Provider(
        provider_id="GOOGLE_PAY",
        name="Google Pay",
        category="PAYMENT",
        contact_email="leo-india@google.com",
        capabilities=[
            RequestTypeCapability(
                request_type="UPI_TX",
                display_name="UPI Transaction History",
                integration_type=IntegrationType.MANUAL,
                sla_hours=120,
                required_documents=[DocumentRequirement.COURT_ORDER, DocumentRequirement.MAGISTRATE_ORDER],
                auto_fillable=False,
                description="Requires India legal process",
                typical_response_format="PDF",
                data_points=[
                    DataPoint("upi_id", "UPI ID / Mobile", required=True, field_type="TEXT",
                              description="Google Pay UPI ID or mobile",
                              help_text="e.g., 9876543210@okaxis or 9876543210"),
                    DataPoint("date_range", "Transaction Period", required=True, field_type="DATE_RANGE",
                              description="Date range for transaction history"),
                ],
            ),
        ]
    ),
    
    # ========== SOCIAL MEDIA & INTERNET ==========
    "WHATSAPP": Provider(
        provider_id="WHATSAPP",
        name="WhatsApp (Meta)",
        category="SOCIAL_MEDIA",
        contact_email="leo@support.whatsapp.com",
        capabilities=[
            RequestTypeCapability(
                request_type="SOCIAL_PROFILE",
                display_name="Account Information",
                integration_type=IntegrationType.MANUAL,
                sla_hours=168,  # 7 days
                required_documents=[DocumentRequirement.COURT_ORDER, DocumentRequirement.MAGISTRATE_ORDER],
                auto_fillable=False,
                description="Account registration details (No message content)",
                typical_response_format="PDF",
                data_points=[
                    DataPoint("phone_number", "WhatsApp Phone Number", required=True, field_type="TEXT",
                              description="Phone number registered with WhatsApp",
                              validation_rule="^\\+?[1-9][0-9]{7,14}$",
                              help_text="Include country code (e.g., +919876543210)"),
                    DataPoint("time_period", "Account Activity Period", required=False, field_type="DATE_RANGE",
                              description="Period for account activity logs (if available)"),
                    DataPoint("include_profile_info", "Profile Information", required=False, field_type="BOOLEAN",
                              description="Include profile picture, about, status",
                              default_value="true"),
                    DataPoint("include_group_info", "Group Memberships", required=False, field_type="BOOLEAN",
                              description="Include list of groups user is member of",
                              default_value="false",
                              help_text="Note: Message content not available due to E2E encryption"),
                ],
            ),
        ]
    ),
    
    "FACEBOOK": Provider(
        provider_id="FACEBOOK",
        name="Facebook/Instagram (Meta)",
        category="SOCIAL_MEDIA",
        contact_email="leo@fb.com",
        capabilities=[
            RequestTypeCapability(
                request_type="SOCIAL_PROFILE",
                display_name="Account & Activity Logs",
                integration_type=IntegrationType.PORTAL,
                sla_hours=240,  # 10 days
                required_documents=[DocumentRequirement.COURT_ORDER],
                auto_fillable=False,
                description="User data via Law Enforcement Portal",
                typical_response_format="PDF",
                data_points=[
                    DataPoint("profile_identifier", "Profile URL / User ID / Email", required=True, field_type="TEXT",
                              description="Facebook/Instagram profile URL, user ID, or registered email",
                              help_text="e.g., https://facebook.com/username or email@example.com"),
                    DataPoint("date_range", "Activity Period", required=False, field_type="DATE_RANGE",
                              description="Date range for activity logs"),
                    DataPoint("include_ip_logs", "IP Address Logs", required=False, field_type="BOOLEAN",
                              description="Include login IP address history",
                              default_value="true"),
                    DataPoint("include_messages", "Private Messages", required=False, field_type="BOOLEAN",
                              description="Include private message metadata (requires court order)",
                              default_value="false"),
                    DataPoint("include_posts", "Posts & Comments", required=False, field_type="BOOLEAN",
                              description="Include user's posts, comments, and reactions",
                              default_value="true"),
                    DataPoint("include_connections", "Friend/Follower List", required=False, field_type="BOOLEAN",
                              description="Include list of friends/followers",
                              default_value="false"),
                ],
            ),
        ]
    ),
}


# ==========================================
# HELPER FUNCTIONS
# ==========================================

def get_provider(provider_id: str) -> Optional[Provider]:
    """Get provider by ID"""
    return PROVIDERS_REGISTRY.get(provider_id)


def get_providers_by_category(category: str) -> List[Provider]:
    """Get all providers in a category"""
    return [p for p in PROVIDERS_REGISTRY.values() if p.category == category]


def find_providers_for_entity_type(entity_type: str) -> List[tuple[Provider, RequestTypeCapability]]:
    """
    Find relevant providers and capabilities for an entity type.
    
    Returns list of (Provider, RequestTypeCapability) tuples.
    """
    results = []
    
    # Map entity types to request types
    entity_to_request_map = {
        'account': ['BANK_ACCOUNT_DETAILS', 'BANK_KYC', 'BENEFICIARY_CHAIN'],
        'phone': ['TELECOM_CDR', 'SIM_KYC', 'TOWER_LOGS'],
        'upi': ['UPI_TRANSACTION_HISTORY', 'WALLET_DETAILS'],
        'email': ['USER_ACCOUNT_INFO'],
        'device': ['DEVICE_INFO', 'IMEI_HISTORY'],
    }
    
    request_types = entity_to_request_map.get(entity_type.lower(), [])
    
    for provider in PROVIDERS_REGISTRY.values():
        for capability in provider.capabilities:
            if capability.request_type in request_types:
                results.append((provider, capability))
    
    # Sort by SLA (fastest first)
    results.sort(key=lambda x: x[1].sla_hours)
    
    return results


def get_request_capability(provider_id: str, request_type: str) -> Optional[RequestTypeCapability]:
    """Get specific capability for a provider"""
    provider = get_provider(provider_id)
    if not provider:
        return None
    
    for capability in provider.capabilities:
        if capability.request_type == request_type:
            return capability
    
    return None


def get_all_providers() -> List[Provider]:
    """Get all registered providers"""
    return list(PROVIDERS_REGISTRY.values())

