"""
LERS Templates Generator

Generates crime-specific LERS request templates with pre-filled data
based on the crime type and extracted evidence.
"""

import logging
from typing import Dict, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class LERSTemplateGenerator:
    """
    Generates LERS request templates for different crime types
    
    Implements intelligent template selection and pre-filling based on:
    - Crime category
    - Available evidence
    - Extracted entities
    - Investigation requirements
    """
    
    # Template definitions for each crime type
    CRIME_TEMPLATES = {
        'FINANCIAL_FRAUD': {
            'suggested_requests': [
                {
                    'provider_type': 'BANK',
                    'request_type': 'ACCOUNT_DETAILS',
                    'priority': 'HIGH',
                    'sla_days': 7,
                    'required_fields': ['account_number', 'date_range'],
                    'description': 'Request full account statement, KYC, and transaction history'
                },
                {
                    'provider_type': 'UPI',
                    'request_type': 'TRANSACTION_HISTORY',
                    'priority': 'HIGH',
                    'sla_days': 5,
                    'required_fields': ['upi_vpa', 'date_range'],
                    'description': 'Request UPI transaction history and linked devices'
                },
                {
                    'provider_type': 'PAYMENT_GATEWAY',
                    'request_type': 'MERCHANT_DETAILS',
                    'priority': 'MEDIUM',
                    'sla_days': 10,
                    'required_fields': ['merchant_id'],
                    'description': 'Request merchant KYC, payout accounts, and IP logs'
                }
            ]
        },
        'SIM_SWAP': {
            'suggested_requests': [
                {
                    'provider_type': 'TELECOM',
                    'request_type': 'CDR',
                    'priority': 'CRITICAL',
                    'sla_days': 3,
                    'required_fields': ['phone_number', 'date_range'],
                    'description': 'Request CDR with SIM change history and IMEI logs'
                },
                {
                    'provider_type': 'TELECOM',
                    'request_type': 'SIM_ISSUANCE',
                    'priority': 'HIGH',
                    'sla_days': 5,
                    'required_fields': ['phone_number'],
                    'description': 'Request SIM issuance details and KYC documents'
                },
                {
                    'provider_type': 'TELECOM',
                    'request_type': 'PORTING_HISTORY',
                    'priority': 'HIGH',
                    'sla_days': 5,
                    'required_fields': ['phone_number'],
                    'description': 'Request porting history and operator changes'
                }
            ]
        },
        'E_COMMERCE_FRAUD': {
            'suggested_requests': [
                {
                    'provider_type': 'ECOMMERCE',
                    'request_type': 'SELLER_DETAILS',
                    'priority': 'HIGH',
                    'sla_days': 7,
                    'required_fields': ['seller_id', 'listing_id'],
                    'description': 'Request seller KYC, payout accounts, and IP logs'
                },
                {
                    'provider_type': 'BANK',
                    'request_type': 'ACCOUNT_DETAILS',
                    'priority': 'HIGH',
                    'sla_days': 7,
                    'required_fields': ['account_number'],
                    'description': 'Request seller payout account details'
                },
                {
                    'provider_type': 'LOGISTICS',
                    'request_type': 'SHIPMENT_DETAILS',
                    'priority': 'MEDIUM',
                    'sla_days': 10,
                    'required_fields': ['tracking_number'],
                    'description': 'Request shipment history and delivery address'
                }
            ]
        },
        'SOCIAL_MEDIA_CRIME': {
            'suggested_requests': [
                {
                    'provider_type': 'SOCIAL_MEDIA',
                    'request_type': 'ACCOUNT_METADATA',
                    'priority': 'HIGH',
                    'sla_days': 10,
                    'required_fields': ['account_handle', 'platform'],
                    'description': 'Request account registration details, IP logs, device info'
                },
                {
                    'provider_type': 'SOCIAL_MEDIA',
                    'request_type': 'POST_TAKEDOWN',
                    'priority': 'CRITICAL',
                    'sla_days': 2,
                    'required_fields': ['post_url'],
                    'description': 'Request immediate takedown of offensive content'
                },
                {
                    'provider_type': 'HOSTING',
                    'request_type': 'SERVER_LOGS',
                    'priority': 'MEDIUM',
                    'sla_days': 14,
                    'required_fields': ['domain', 'ip_address'],
                    'description': 'Request server access logs and hosting details'
                }
            ]
        },
        'MALWARE': {
            'suggested_requests': [
                {
                    'provider_type': 'HOSTING',
                    'request_type': 'SERVER_LOGS',
                    'priority': 'HIGH',
                    'sla_days': 7,
                    'required_fields': ['ip_address', 'domain'],
                    'description': 'Request C&C server logs and malware distribution details'
                },
                {
                    'provider_type': 'DOMAIN_REGISTRAR',
                    'request_type': 'WHOIS_DETAILS',
                    'priority': 'MEDIUM',
                    'sla_days': 10,
                    'required_fields': ['domain'],
                    'description': 'Request domain registration and owner details'
                }
            ]
        }
    }
    
    @classmethod
    def generate_templates(cls, crime_category: str, extracted_entities: Dict, case_data: Dict) -> List[Dict]:
        """
        Generate LERS request templates for a crime category
        
        Args:
            crime_category: Crime category (e.g., 'FINANCIAL_FRAUD')
            extracted_entities: Extracted entities from evidence
            case_data: Case information
        
        Returns:
            List of pre-filled LERS request templates
        """
        # Get base templates for crime category
        category_key = cls._normalize_category(crime_category)
        base_templates = cls.CRIME_TEMPLATES.get(category_key, [])
        
        if not base_templates:
            logger.warning(f"No LERS templates defined for category: {crime_category}")
            return []
        
        # Pre-fill templates with extracted data
        filled_templates = []
        for template in base_templates.get('suggested_requests', []):
            filled = cls._fill_template(template, extracted_entities, case_data)
            if filled:
                filled_templates.append(filled)
        
        logger.info(f"Generated {len(filled_templates)} LERS templates for {crime_category}")
        return filled_templates
    
    @classmethod
    def _fill_template(cls, template: Dict, entities: Dict, case_data: Dict) -> Dict:
        """Fill template with available entity data"""
        filled = template.copy()
        
        # Pre-fill required fields if available
        filled['prefilled_data'] = {}
        
        for field in template.get('required_fields', []):
            value = cls._extract_field_value(field, entities, case_data)
            if value:
                filled['prefilled_data'][field] = value
        
        # Add case reference
        filled['case_reference'] = {
            'case_number': case_data.get('case_number'),
            'ack_number': case_data.get('ack_number'),
            'station': case_data.get('station'),
        }
        
        # Calculate due date
        if 'sla_days' in filled:
            filled['suggested_due_date'] = (
                datetime.now() + timedelta(days=filled['sla_days'])
            ).isoformat()
        
        return filled
    
    @classmethod
    def _extract_field_value(cls, field: str, entities: Dict, case_data: Dict):
        """Extract field value from entities or case data"""
        # Map fields to entity types
        field_mappings = {
            'account_number': ['accounts', 'account_number'],
            'upi_vpa': ['accounts', 'upi_vpa'],
            'phone_number': ['persons', 'phone'],
            'merchant_id': ['entities', 'merchant_id'],
            'seller_id': ['entities', 'seller_id'],
            'listing_id': ['entities', 'listing_id'],
            'tracking_number': ['entities', 'tracking_number'],
            'account_handle': ['entities', 'social_handle'],
            'platform': ['entities', 'platform'],
            'post_url': ['entities', 'post_url'],
            'ip_address': ['entities', 'ip_address'],
            'domain': ['entities', 'domain'],
            'imei': ['devices', 'imei'],
        }
        
        mapping = field_mappings.get(field)
        if not mapping:
            return None
        
        entity_type, entity_field = mapping
        entity_list = entities.get(entity_type, [])
        
        if entity_list:
            # Return first available value
            first_entity = entity_list[0]
            return first_entity.get(entity_field)
        
        # Try case_data
        return case_data.get(field)
    
    @classmethod
    def _normalize_category(cls, category: str) -> str:
        """Normalize crime category to template key"""
        # Map various category names to template keys
        category_map = {
            'UPI_FRAUD': 'FINANCIAL_FRAUD',
            'ONLINE_BANKING_PHISHING': 'FINANCIAL_FRAUD',
            'FAKE_UPI_REQUEST': 'FINANCIAL_FRAUD',
            'LOAN_FRAUD': 'FINANCIAL_FRAUD',
            'INVESTMENT_FRAUD': 'FINANCIAL_FRAUD',
            'CRYPTOCURRENCY_SCAM': 'FINANCIAL_FRAUD',
            'SIM_SWAP_FRAUD': 'SIM_SWAP',
            'ACCOUNT_HACKING': 'SIM_SWAP',
            'SIM_SWAP_UPI_DRAIN': 'SIM_SWAP',
            'E_COMMERCE_FRAUD': 'E_COMMERCE_FRAUD',
            'OLX_FRAUD': 'E_COMMERCE_FRAUD',
            'FAKE_SELLER': 'E_COMMERCE_FRAUD',
            'CYBERBULLYING': 'SOCIAL_MEDIA_CRIME',
            'CYBERSTALKING': 'SOCIAL_MEDIA_CRIME',
            'DEFAMATION': 'SOCIAL_MEDIA_CRIME',
            'FAKE_PROFILE': 'SOCIAL_MEDIA_CRIME',
            'MALWARE_INFECTION': 'MALWARE',
            'RANSOMWARE_ATTACK': 'MALWARE',
            'SPREADING_MALWARE': 'MALWARE',
        }
        
        return category_map.get(category, category)
    
    @classmethod
    def get_provider_list(cls, provider_type: str) -> List[Dict]:
        """
        Get list of known providers for a type
        
        Returns list of providers with contact details
        """
        # In production, this would query a database of registered providers
        providers = {
            'BANK': [
                {'name': 'State Bank of India', 'code': 'SBI', 'contact_email': 'sbi-legal@sbi.co.in'},
                {'name': 'HDFC Bank', 'code': 'HDFC', 'contact_email': 'legal@hdfcbank.com'},
                {'name': 'ICICI Bank', 'code': 'ICICI', 'contact_email': 'legal@icicibank.com'},
                {'name': 'Axis Bank', 'code': 'AXIS', 'contact_email': 'legal@axisbank.com'},
            ],
            'TELECOM': [
                {'name': 'Bharti Airtel', 'code': 'AIRTEL', 'contact_email': 'legal@airtel.in'},
                {'name': 'Reliance Jio', 'code': 'JIO', 'contact_email': 'legal@jio.com'},
                {'name': 'Vodafone Idea', 'code': 'VI', 'contact_email': 'legal@myvi.in'},
                {'name': 'BSNL', 'code': 'BSNL', 'contact_email': 'legal@bsnl.co.in'},
            ],
            'UPI': [
                {'name': 'NPCI - UPI', 'code': 'NPCI', 'contact_email': 'legal@npci.org.in'},
                {'name': 'PhonePe', 'code': 'PHONEPE', 'contact_email': 'legal@phonepe.com'},
                {'name': 'Google Pay', 'code': 'GPAY', 'contact_email': 'legal-india@google.com'},
                {'name': 'Paytm', 'code': 'PAYTM', 'contact_email': 'legal@paytm.com'},
            ],
            'SOCIAL_MEDIA': [
                {'name': 'Meta (Facebook/Instagram)', 'code': 'META', 'contact_email': 'legal-india@fb.com'},
                {'name': 'Twitter/X', 'code': 'TWITTER', 'contact_email': 'legal@twitter.com'},
                {'name': 'YouTube/Google', 'code': 'YOUTUBE', 'contact_email': 'legal-india@google.com'},
            ],
            'ECOMMERCE': [
                {'name': 'Amazon India', 'code': 'AMAZON', 'contact_email': 'legal-india@amazon.com'},
                {'name': 'Flipkart', 'code': 'FLIPKART', 'contact_email': 'legal@flipkart.com'},
                {'name': 'OLX India', 'code': 'OLX', 'contact_email': 'legal@olx.in'},
            ],
        }
        
        return providers.get(provider_type, [])
    
    @classmethod
    def suggest_sla(cls, priority: str, provider_type: str) -> int:
        """Suggest SLA days based on priority and provider type"""
        # Base SLAs
        base_slas = {
            'CRITICAL': 3,
            'HIGH': 7,
            'MEDIUM': 14,
            'LOW': 21,
        }
        
        # Provider-specific adjustments
        provider_adjustments = {
            'TELECOM': -2,  # Telecom usually faster
            'SOCIAL_MEDIA': +5,  # Social media typically slower
            'INTERNATIONAL': +14,  # International requests much slower
        }
        
        base = base_slas.get(priority, 14)
        adjustment = provider_adjustments.get(provider_type, 0)
        
        return max(1, base + adjustment)
    
    @classmethod
    def generate_request_description(cls, template: Dict, entities: Dict) -> str:
        """Generate detailed request description from template"""
        desc = template.get('description', '')
        
        # Add entity details
        entity_details = []
        for field in template.get('required_fields', []):
            value = template.get('prefilled_data', {}).get(field)
            if value:
                entity_details.append(f"{field.replace('_', ' ').title()}: {value}")
        
        if entity_details:
            desc += "\n\nDetails:\n- " + "\n- ".join(entity_details)
        
        return desc

