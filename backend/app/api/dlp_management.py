from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timedelta
from app.db.session import get_db
from app.db import models
from app.auth.deps import require_admin_role
from sqlalchemy import func, desc, or_, and_
import json
import random

router = APIRouter(prefix="/admin/dlp", tags=["dlp-management"])

# Enhanced Models
class EntityDefinition(BaseModel):
    name: str
    type: str  # "block" or "mask"
    description: Optional[str] = None
    regex_pattern: Optional[str] = None
    confidence_threshold: Optional[float] = None
    is_custom: bool = False
    is_active: bool = True

class PolicyRuleAdvanced(BaseModel):
    name: str
    entity_types: List[str]  # Multiple entity types
    action: str  # "allow", "mask", "block"
    priority: int = Field(ge=1, le=100)
    description: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None  # Advanced conditions
    exceptions: Optional[Dict[str, Any]] = None  # User/group exceptions
    schedule: Optional[Dict[str, Any]] = None  # Time-based rules
    is_active: bool = True

class BulkPolicyOperation(BaseModel):
    operation: str  # "activate", "deactivate", "delete", "update_priority"
    policy_ids: List[str]
    data: Optional[Dict[str, Any]] = None

class UserException(BaseModel):
    user_id: str
    policy_id: str
    exception_type: str  # "allow", "bypass", "custom"
    expiry_date: Optional[datetime] = None
    reason: Optional[str] = None

class PolicyTemplate(BaseModel):
    name: str
    description: str
    rules: List[PolicyRuleAdvanced]
    category: str  # "financial", "healthcare", "general", etc.

# Rule Sets Models - Enhanced SkyHigh-like
class RuleSetCriteria(BaseModel):
    condition_type: str  # "prompt_contains", "entity_detected", "user_is", "regex", "file_type", "file_size"
    entity_types: Optional[List[str]] = None  # Entity types to check
    text_patterns: Optional[List[str]] = None  # Text patterns to match
    regex_pattern: Optional[str] = None  # Custom regex
    user_conditions: Optional[Dict[str, Any]] = None  # User-based conditions (role, group, etc.)
    file_conditions: Optional[Dict[str, Any]] = None  # File-based conditions
    logical_operator: str = "AND"  # "AND", "OR", "NOT"
    negate: bool = False  # For NOT operations

class RuleSetRule(BaseModel):
    name: str
    criteria: List[RuleSetCriteria]  # Multiple criteria with logical operators
    action: str  # "allow", "mask", "block", "remove"
    action_config: Optional[Dict[str, Any]] = None  # Action-specific configuration
    priority: int = 1  # Higher number = higher priority
    is_active: bool = True
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class RuleSetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rules: List[RuleSetRule]
    priority: int = Field(ge=1, le=100, default=1)  # Global rule set priority
    is_active: bool = True
    tags: Optional[List[str]] = None  # For categorization
    category: Optional[str] = None  # "security", "compliance", "custom"

class RuleSetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rules: Optional[List[RuleSetRule]] = None
    priority: Optional[int] = Field(None, ge=1, le=100)
    is_active: Optional[bool] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None

# Entity Management Endpoints
@router.get("/entities")
async def list_entities(
    entity_type: Optional[str] = Query(None, description="Filter by type: block, mask"),
    is_custom: Optional[bool] = Query(None, description="Filter custom entities"),
    search: Optional[str] = Query(None, description="Search in name or description"),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """List all available entities with filtering"""
    # Get predefined entities from policy.py
    from app.dlp.policy import BLOCK_ENTITIES, MASK_ENTITIES
    
    predefined_entities = []
    
    # Add block entities
    for entity in BLOCK_ENTITIES:
        predefined_entities.append({
            "name": entity,
            "type": "block",
            "description": f"Predefined block entity: {entity}",
            "is_custom": False,
            "is_active": True
        })
    
    # Add mask entities
    for entity in MASK_ENTITIES:
        predefined_entities.append({
            "name": entity,
            "type": "mask", 
            "description": f"Predefined mask entity: {entity}",
            "is_custom": False,
            "is_active": True
        })
    
    # Get custom entities from database (we'll store them in system config)
    custom_entities_config = db.query(models.SystemConfig).filter(
        models.SystemConfig.key == "custom_dlp_entities"
    ).first()
    
    custom_entities = []
    if custom_entities_config and custom_entities_config.value:
        try:
            custom_entities = json.loads(custom_entities_config.value)
        except:
            custom_entities = []
    
    all_entities = predefined_entities + custom_entities
    
    # Apply filters
    if entity_type:
        all_entities = [e for e in all_entities if e.get("type") == entity_type]
    
    if is_custom is not None:
        all_entities = [e for e in all_entities if e.get("is_custom") == is_custom]
    
    if search:
        search_lower = search.lower()
        all_entities = [e for e in all_entities if 
                       search_lower in e.get("name", "").lower() or 
                       search_lower in e.get("description", "").lower()]
    
    return {
        "entities": all_entities,
        "total": len(all_entities),
        "predefined_count": len(predefined_entities),
        "custom_count": len(custom_entities)
    }

@router.post("/entities")
async def create_custom_entity(
    entity: EntityDefinition,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Create a custom entity definition"""
    # Get existing custom entities
    custom_entities_config = db.query(models.SystemConfig).filter(
        models.SystemConfig.key == "custom_dlp_entities"
    ).first()
    
    custom_entities = []
    if custom_entities_config and custom_entities_config.value:
        try:
            custom_entities = json.loads(custom_entities_config.value)
        except:
            custom_entities = []
    
    # Check if entity already exists
    if any(e.get("name") == entity.name for e in custom_entities):
        raise HTTPException(400, f"Entity '{entity.name}' already exists")
    
    # Add new entity
    new_entity = entity.dict()
    new_entity["is_custom"] = True
    new_entity["created_at"] = datetime.now().isoformat()
    new_entity["created_by"] = user.id
    
    custom_entities.append(new_entity)
    
    # Save to database
    if custom_entities_config:
        custom_entities_config.value = json.dumps(custom_entities)
    else:
        custom_entities_config = models.SystemConfig(
            key="custom_dlp_entities",
            value=json.dumps(custom_entities),
            data_type="json",
            description="Custom DLP entity definitions",
            is_public=False
        )
        db.add(custom_entities_config)
    
    db.commit()
    
    return {"message": "Custom entity created successfully", "entity": new_entity}

@router.delete("/entities/{entity_name}")
async def delete_custom_entity(
    entity_name: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Delete a custom entity"""
    # Get existing custom entities
    custom_entities_config = db.query(models.SystemConfig).filter(
        models.SystemConfig.key == "custom_dlp_entities"
    ).first()
    
    if not custom_entities_config:
        raise HTTPException(404, "No custom entities found")
    
    try:
        custom_entities = json.loads(custom_entities_config.value)
    except:
        raise HTTPException(500, "Invalid custom entities data")
    
    # Find and remove entity
    original_count = len(custom_entities)
    custom_entities = [e for e in custom_entities if e.get("name") != entity_name]
    
    if len(custom_entities) == original_count:
        raise HTTPException(404, f"Custom entity '{entity_name}' not found")
    
    # Save updated list
    custom_entities_config.value = json.dumps(custom_entities)
    db.commit()
    
    return {"message": f"Custom entity '{entity_name}' deleted successfully"}

# Advanced Policy Management
@router.post("/policies")
async def create_policy(
    policy: PolicyRuleAdvanced,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Create a new advanced DLP policy"""
    try:
        db_policy = models.DlpPolicyRule(
            name=policy.name,
            entity_type=",".join(policy.entity_types),
            action=policy.action,
            priority=policy.priority,
            description=policy.description,
            config_json=policy.conditions,
            created_by=user.id,
            is_active=policy.is_active
        )
        
        db.add(db_policy)
        db.commit()
        db.refresh(db_policy)
        
        # Cache'i invalidate et
        from app.dlp.policy_manager import invalidate_policy_cache
        invalidate_policy_cache()
        
        return {"id": db_policy.id, "message": "Policy created successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating policy: {str(e)}")

@router.get("/policies/advanced")
async def list_policies_advanced(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_by: str = Query("priority", regex="^(priority|name|created_at|action)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Advanced policy listing with filtering, sorting, and pagination"""
    query = db.query(models.DlpPolicyRule)
    
    # Apply filters
    if search:
        search_filter = or_(
            models.DlpPolicyRule.name.ilike(f"%{search}%"),
            models.DlpPolicyRule.description.ilike(f"%{search}%"),
            models.DlpPolicyRule.entity_type.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if entity_type:
        query = query.filter(models.DlpPolicyRule.entity_type.ilike(f"%{entity_type}%"))
    
    if action:
        query = query.filter(models.DlpPolicyRule.action == action)
    
    if is_active is not None:
        query = query.filter(models.DlpPolicyRule.is_active == is_active)
    
    # Apply sorting
    if sort_by == "priority":
        order_col = models.DlpPolicyRule.priority
    elif sort_by == "name":
        order_col = models.DlpPolicyRule.name
    elif sort_by == "created_at":
        order_col = models.DlpPolicyRule.created_at
    elif sort_by == "action":
        order_col = models.DlpPolicyRule.action
    
    if sort_order == "desc":
        query = query.order_by(desc(order_col))
    else:
        query = query.order_by(order_col)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * limit
    policies = query.offset(offset).limit(limit).all()
    
    # Format response
    policy_list = []
    for p in policies:
        policy_data = {
            "id": p.id,
            "name": p.name,
            "entity_type": p.entity_type,
            "action": p.action,
            "config": p.config_json,
            "priority": p.priority,
            "description": p.description,
            "created_by": p.created_by,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else None
        }
        policy_list.append(policy_data)
    
    return {
        "policies": policy_list,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        },
        "filters": {
            "search": search,
            "entity_type": entity_type,
            "action": action,
            "is_active": is_active,
            "sort_by": sort_by,
            "sort_order": sort_order
        }
    }

@router.post("/policies/bulk")
async def bulk_policy_operations(
    operation: BulkPolicyOperation,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Perform bulk operations on policies"""
    if not operation.policy_ids:
        raise HTTPException(400, "No policy IDs provided")
    
    policies = db.query(models.DlpPolicyRule).filter(
        models.DlpPolicyRule.id.in_(operation.policy_ids)
    ).all()
    
    if len(policies) != len(operation.policy_ids):
        raise HTTPException(404, "Some policies not found")
    
    updated_count = 0
    
    if operation.operation == "activate":
        for policy in policies:
            policy.is_active = True
            updated_count += 1
    
    elif operation.operation == "deactivate":
        for policy in policies:
            policy.is_active = False
            updated_count += 1
    
    elif operation.operation == "delete":
        for policy in policies:
            db.delete(policy)
            updated_count += 1
    
    elif operation.operation == "update_priority":
        if not operation.data or "priority" not in operation.data:
            raise HTTPException(400, "Priority value required for update_priority operation")
        
        priority = operation.data["priority"]
        for policy in policies:
            policy.priority = priority
            updated_count += 1
    
    else:
        raise HTTPException(400, f"Unknown operation: {operation.operation}")
    
    db.commit()
    
    return {
        "message": f"Bulk operation '{operation.operation}' completed",
        "updated_count": updated_count,
        "policy_ids": operation.policy_ids
    }

@router.post("/policies/reorder")
async def reorder_policies(
    policy_orders: List[Dict[str, Union[str, int]]],  # [{"id": "policy_id", "priority": 1}, ...]
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Reorder policies by updating their priorities"""
    policy_ids = [item["id"] for item in policy_orders]
    policies = db.query(models.DlpPolicyRule).filter(
        models.DlpPolicyRule.id.in_(policy_ids)
    ).all()
    
    policy_dict = {p.id: p for p in policies}
    updated_count = 0
    
    for order_item in policy_orders:
        policy_id = order_item["id"]
        new_priority = order_item["priority"]
        
        if policy_id in policy_dict:
            policy_dict[policy_id].priority = new_priority
            updated_count += 1
    
    db.commit()
    
    return {
        "message": "Policies reordered successfully",
        "updated_count": updated_count
    }

# User Exception Management
@router.get("/exceptions")
async def list_user_exceptions(
    user_id: Optional[str] = Query(None),
    policy_id: Optional[str] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_admin_role())
):
    """List user exceptions for policies"""
    # Get exceptions from system config (we'll store them there for now)
    exceptions_config = db.query(models.SystemConfig).filter(
        models.SystemConfig.key == "dlp_user_exceptions"
    ).first()
    
    exceptions = []
    if exceptions_config and exceptions_config.value:
        try:
            exceptions = json.loads(exceptions_config.value)
        except:
            exceptions = []
    
    # Apply filters
    if user_id:
        exceptions = [e for e in exceptions if e.get("user_id") == user_id]
    
    if policy_id:
        exceptions = [e for e in exceptions if e.get("policy_id") == policy_id]
    
    if active_only:
        current_time = datetime.now()
        exceptions = [e for e in exceptions if 
                     not e.get("expiry_date") or 
                     datetime.fromisoformat(e["expiry_date"]) > current_time]
    
    return {"exceptions": exceptions, "total": len(exceptions)}

@router.post("/exceptions")
async def create_user_exception(
    exception: UserException,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(require_admin_role())
):
    """Create a user exception for a policy"""
    # Validate user and policy exist
    user = db.query(models.User).filter(models.User.id == exception.user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    policy = db.query(models.DlpPolicyRule).filter(models.DlpPolicyRule.id == exception.policy_id).first()
    if not policy:
        raise HTTPException(404, "Policy not found")
    
    # Get existing exceptions
    exceptions_config = db.query(models.SystemConfig).filter(
        models.SystemConfig.key == "dlp_user_exceptions"
    ).first()
    
    exceptions = []
    if exceptions_config and exceptions_config.value:
        try:
            exceptions = json.loads(exceptions_config.value)
        except:
            exceptions = []
    
    # Create new exception
    new_exception = {
        "id": f"{exception.user_id}_{exception.policy_id}_{datetime.now().timestamp()}",
        "user_id": exception.user_id,
        "policy_id": exception.policy_id,
        "exception_type": exception.exception_type,
        "expiry_date": exception.expiry_date.isoformat() if exception.expiry_date else None,
        "reason": exception.reason,
        "created_by": admin_user.id,
        "created_at": datetime.now().isoformat()
    }
    
    exceptions.append(new_exception)
    
    # Save to database
    if exceptions_config:
        exceptions_config.value = json.dumps(exceptions)
    else:
        exceptions_config = models.SystemConfig(
            key="dlp_user_exceptions",
            value=json.dumps(exceptions),
            data_type="json",
            description="DLP user exceptions",
            is_public=False
        )
        db.add(exceptions_config)
    
    db.commit()
    
    return {"message": "User exception created successfully", "exception": new_exception}

# Policy Templates
@router.get("/templates")
async def list_policy_templates(
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """List available policy templates"""
    # Predefined templates
    templates = [
        {
            "id": "financial_basic",
            "name": "Financial Data Protection - Basic",
            "description": "Basic financial data protection with credit card and IBAN blocking",
            "category": "financial",
            "rules": [
                {
                    "name": "Block Credit Cards",
                    "entity_types": ["CREDIT_CARD"],
                    "action": "block",
                    "priority": 90,
                    "description": "Block all credit card numbers"
                },
                {
                    "name": "Block IBAN",
                    "entity_types": ["IBAN"],
                    "action": "block", 
                    "priority": 85,
                    "description": "Block all IBAN numbers"
                }
            ]
        },
        {
            "id": "healthcare_hipaa",
            "name": "Healthcare HIPAA Compliance",
            "description": "HIPAA compliant policy for healthcare data",
            "category": "healthcare",
            "rules": [
                {
                    "name": "Mask Personal Names",
                    "entity_types": ["PERSON"],
                    "action": "mask",
                    "priority": 70,
                    "description": "Mask personal names in healthcare context"
                },
                {
                    "name": "Block SSN",
                    "entity_types": ["TR_TCKN"],
                    "action": "block",
                    "priority": 95,
                    "description": "Block social security numbers"
                }
            ]
        },
        {
            "id": "general_privacy",
            "name": "General Privacy Protection",
            "description": "General privacy protection for common PII",
            "category": "general",
            "rules": [
                {
                    "name": "Mask Email Addresses",
                    "entity_types": ["EMAIL"],
                    "action": "mask",
                    "priority": 60,
                    "description": "Mask email addresses"
                },
                {
                    "name": "Mask Phone Numbers",
                    "entity_types": ["PHONE"],
                    "action": "mask",
                    "priority": 65,
                    "description": "Mask phone numbers"
                }
            ]
        }
    ]
    
    if category:
        templates = [t for t in templates if t["category"] == category]
    
    return {"templates": templates, "total": len(templates)}

@router.post("/templates/{template_id}/apply")
async def apply_policy_template(
    template_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Apply a policy template by creating the policies"""
    # Get template (this would normally be from database)
    templates_response = await list_policy_templates(db=db, user=user)
    template = next((t for t in templates_response["templates"] if t["id"] == template_id), None)
    
    if not template:
        raise HTTPException(404, "Template not found")
    
    created_policies = []
    
    for rule in template["rules"]:
        # Check if policy with same name already exists
        existing = db.query(models.DlpPolicyRule).filter(
            models.DlpPolicyRule.name == rule["name"]
        ).first()
        
        if existing:
            continue  # Skip if already exists
        
        # Create new policy
        policy = models.DlpPolicyRule(
            name=rule["name"],
            entity_type=",".join(rule["entity_types"]),  # Store as comma-separated
            action=rule["action"],
            priority=rule["priority"],
            description=rule.get("description"),
            created_by=user.id,
            is_active=True,
            config_json=rule.get("conditions")
        )
        
        db.add(policy)
        created_policies.append(rule["name"])
    
    db.commit()
    
    return {
        "message": f"Template '{template['name']}' applied successfully",
        "created_policies": created_policies,
        "template": template
    }

# Import/Export
@router.get("/export")
async def export_policies(
    format: str = Query("json", regex="^(json|csv)$"),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Export policies in JSON or CSV format"""
    query = db.query(models.DlpPolicyRule)
    
    if not include_inactive:
        query = query.filter(models.DlpPolicyRule.is_active == True)
    
    policies = query.order_by(models.DlpPolicyRule.priority.desc()).all()
    
    export_data = []
    for p in policies:
        policy_data = {
            "name": p.name,
            "entity_type": p.entity_type,
            "action": p.action,
            "priority": p.priority,
            "description": p.description,
            "config": p.config_json,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else None
        }
        export_data.append(policy_data)
    
    return {
        "format": format,
        "timestamp": datetime.now().isoformat(),
        "total_policies": len(export_data),
        "data": export_data
    }

@router.post("/import")
async def import_policies(
    policies_data: List[Dict[str, Any]],
    overwrite_existing: bool = False,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Import policies from JSON data"""
    imported_count = 0
    skipped_count = 0
    errors = []
    
    for policy_data in policies_data:
        try:
            # Validate required fields
            required_fields = ["name", "entity_type", "action", "priority"]
            for field in required_fields:
                if field not in policy_data:
                    errors.append(f"Missing required field '{field}' in policy: {policy_data.get('name', 'Unknown')}")
                    continue
            
            # Check if policy exists
            existing = db.query(models.DlpPolicyRule).filter(
                models.DlpPolicyRule.name == policy_data["name"]
            ).first()
            
            if existing and not overwrite_existing:
                skipped_count += 1
                continue
            
            if existing and overwrite_existing:
                # Update existing policy
                existing.entity_type = policy_data["entity_type"]
                existing.action = policy_data["action"]
                existing.priority = policy_data["priority"]
                existing.description = policy_data.get("description")
                existing.config_json = policy_data.get("config")
                existing.is_active = policy_data.get("is_active", True)
            else:
                # Create new policy
                policy = models.DlpPolicyRule(
                    name=policy_data["name"],
                    entity_type=policy_data["entity_type"],
                    action=policy_data["action"],
                    priority=policy_data["priority"],
                    description=policy_data.get("description"),
                    config_json=policy_data.get("config"),
                    created_by=user.id,
                    is_active=policy_data.get("is_active", True)
                )
                db.add(policy)
            
            imported_count += 1
            
        except Exception as e:
            errors.append(f"Error importing policy '{policy_data.get('name', 'Unknown')}': {str(e)}")
    
    db.commit()
    
    return {
        "message": "Import completed",
        "imported_count": imported_count,
        "skipped_count": skipped_count,
        "errors": errors,
        "total_processed": len(policies_data)
    }

# DLP Stats and Activity Endpoints
@router.get("/stats")
async def get_dlp_stats(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Get DLP statistics and metrics"""
    try:
        # Get policy counts
        total_policies = db.query(models.DlpPolicyRule).count()
        active_policies = db.query(models.DlpPolicyRule).filter(models.DlpPolicyRule.is_active == True).count()
        
        # Get entity counts (mock data for now)
        total_entities = 15  # Mock count
        custom_entities = 5  # Mock count
        
        # Get recent activity counts (mock data)
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        
        # Mock activity data
        blocked_today = random.randint(10, 50)
        masked_today = random.randint(5, 25)
        allowed_today = random.randint(100, 300)
        
        blocked_week = random.randint(50, 200)
        masked_week = random.randint(20, 100)
        allowed_week = random.randint(500, 1500)
        
        return {
            "policies": {
                "total": total_policies,
                "active": active_policies,
                "inactive": total_policies - active_policies
            },
            "entities": {
                "total": total_entities,
                "custom": custom_entities,
                "builtin": total_entities - custom_entities
            },
            "activity": {
                "today": {
                    "blocked": blocked_today,
                    "masked": masked_today,
                    "allowed": allowed_today,
                    "total": blocked_today + masked_today + allowed_today
                },
                "week": {
                    "blocked": blocked_week,
                    "masked": masked_week,
                    "allowed": allowed_week,
                    "total": blocked_week + masked_week + allowed_week
                }
            },
            "trends": {
                "blocked_trend": random.choice(["up", "down", "stable"]),
                "masked_trend": random.choice(["up", "down", "stable"]),
                "policy_effectiveness": round(random.uniform(85.0, 98.0), 1)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching DLP stats: {str(e)}")

@router.get("/activity")
async def get_dlp_activity(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    action_type: Optional[str] = Query(None, regex="^(blocked|masked|allowed)$"),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Get recent DLP activity logs"""
    try:
        # Mock activity data for now
        activities = []
        action_types = ["blocked", "masked", "allowed"]
        entity_types = ["email", "phone", "ssn", "credit_card", "ip_address"]
        
        for i in range(limit):
            activity_time = datetime.now() - timedelta(minutes=random.randint(1, 1440))  # Last 24 hours
            action = random.choice(action_types) if not action_type else action_type
            
            activities.append({
                "id": f"activity_{i + offset + 1}",
                "timestamp": activity_time.isoformat(),
                "action": action,
                "entity_type": random.choice(entity_types),
                "policy_name": f"Policy {random.randint(1, 10)}",
                "user_id": f"user_{random.randint(1, 100)}",
                "content_preview": f"Detected {random.choice(entity_types)} in message",
                "severity": random.choice(["low", "medium", "high"]),
                "source": random.choice(["chat", "email", "document", "api"])
            })
        
        # Sort by timestamp descending
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return {
            "activities": activities,
            "total": 1000,  # Mock total count
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < 1000
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching DLP activity: {str(e)}")

# Rule Sets Management Endpoints
@router.get("/rule-sets")
async def list_rule_sets(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_by: str = Query("priority", regex="^(priority|name|created_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Rule Sets listesini getir"""
    try:
        query = db.query(models.DlpRuleSet)
        
        # Filtreleme
        if search:
            query = query.filter(
                or_(
                    models.DlpRuleSet.name.ilike(f"%{search}%"),
                    models.DlpRuleSet.description.ilike(f"%{search}%")
                )
            )
        
        if is_active is not None:
            query = query.filter(models.DlpRuleSet.is_active == is_active)
        
        # Sıralama
        if sort_by == "priority":
            order_col = models.DlpRuleSet.priority
        elif sort_by == "name":
            order_col = models.DlpRuleSet.name
        else:
            order_col = models.DlpRuleSet.created_at
            
        if sort_order == "desc":
            query = query.order_by(desc(order_col))
        else:
            query = query.order_by(order_col)
        
        # Toplam sayı
        total = query.count()
        
        # Sayfalama
        offset = (page - 1) * limit
        rule_sets = query.offset(offset).limit(limit).all()
        
        # Her rule set için kuralları da getir
        result = []
        for rule_set in rule_sets:
            rules = db.query(models.DlpRuleSetRule).filter(
                models.DlpRuleSetRule.rule_set_id == rule_set.id
            ).order_by(models.DlpRuleSetRule.priority).all()
            
            result.append({
                "id": rule_set.id,
                "name": rule_set.name,
                "description": rule_set.description,
                "is_active": rule_set.is_active,
                "priority": rule_set.priority,
                "created_at": rule_set.created_at,
                "rules_count": len(rules),
                "rules": [
                    {
                        "id": rule.id,
                        "name": rule.name,
                        "criteria": rule.criteria,
                        "action": rule.action,
                        "action_config": rule.action_config,
                        "priority": rule.priority,
                        "is_active": rule.is_active,
                        "description": rule.description
                    } for rule in rules
                ]
            })
        
        return {
            "rule_sets": result,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching rule sets: {str(e)}")

@router.post("/rule-sets")
async def create_rule_set(
    rule_set: RuleSetCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Yeni Rule Set oluştur"""
    try:
        # Rule Set oluştur
        db_rule_set = models.DlpRuleSet(
            name=rule_set.name,
            description=rule_set.description,
            is_active=rule_set.is_active,
            priority=rule_set.priority,
            created_by=user.id
        )
        db.add(db_rule_set)
        db.flush()  # ID'yi almak için
        
        # Kuralları oluştur
        for rule_data in rule_set.rules:
            db_rule = models.DlpRuleSetRule(
                rule_set_id=db_rule_set.id,
                name=rule_data.name,
                criteria=rule_data.criteria.dict(),
                action=rule_data.action,
                action_config=rule_data.action_config,
                priority=rule_data.priority,
                is_active=rule_data.is_active,
                description=rule_data.description,
                created_by=user.id
            )
            db.add(db_rule)
        
        db.commit()
        
        # Cache'i invalidate et
        from app.dlp.policy_manager import invalidate_policy_cache
        invalidate_policy_cache()
        
        return {
            "message": "Rule Set başarıyla oluşturuldu",
            "rule_set_id": db_rule_set.id
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating rule set: {str(e)}")

@router.get("/rule-sets/{rule_set_id}")
async def get_rule_set(
    rule_set_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Belirli bir Rule Set'i getir"""
    try:
        rule_set = db.query(models.DlpRuleSet).filter(
            models.DlpRuleSet.id == rule_set_id
        ).first()
        
        if not rule_set:
            raise HTTPException(status_code=404, detail="Rule Set bulunamadı")
        
        # Kuralları getir
        rules = db.query(models.DlpRuleSetRule).filter(
            models.DlpRuleSetRule.rule_set_id == rule_set_id
        ).order_by(models.DlpRuleSetRule.priority).all()
        
        return {
            "id": rule_set.id,
            "name": rule_set.name,
            "description": rule_set.description,
            "is_active": rule_set.is_active,
            "priority": rule_set.priority,
            "created_at": rule_set.created_at,
            "rules": [
                {
                    "id": rule.id,
                    "name": rule.name,
                    "criteria": rule.criteria,
                    "action": rule.action,
                    "action_config": rule.action_config,
                    "priority": rule.priority,
                    "is_active": rule.is_active,
                    "description": rule.description
                } for rule in rules
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching rule set: {str(e)}")

@router.put("/rule-sets/{rule_set_id}")
async def update_rule_set(
    rule_set_id: str,
    rule_set_update: RuleSetUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Rule Set'i güncelle"""
    try:
        rule_set = db.query(models.DlpRuleSet).filter(
            models.DlpRuleSet.id == rule_set_id
        ).first()
        
        if not rule_set:
            raise HTTPException(status_code=404, detail="Rule Set bulunamadı")
        
        # Rule Set bilgilerini güncelle
        if rule_set_update.name is not None:
            rule_set.name = rule_set_update.name
        if rule_set_update.description is not None:
            rule_set.description = rule_set_update.description
        if rule_set_update.priority is not None:
            rule_set.priority = rule_set_update.priority
        if rule_set_update.is_active is not None:
            rule_set.is_active = rule_set_update.is_active
        
        # Kuralları güncelle
        if rule_set_update.rules is not None:
            # Mevcut kuralları sil
            db.query(models.DlpRuleSetRule).filter(
                models.DlpRuleSetRule.rule_set_id == rule_set_id
            ).delete()
            
            # Yeni kuralları ekle
            for rule_data in rule_set_update.rules:
                db_rule = models.DlpRuleSetRule(
                    rule_set_id=rule_set_id,
                    name=rule_data.name,
                    criteria=rule_data.criteria.dict(),
                    action=rule_data.action,
                    action_config=rule_data.action_config,
                    priority=rule_data.priority,
                    is_active=rule_data.is_active,
                    description=rule_data.description,
                    created_by=user.id
                )
                db.add(db_rule)
        
        db.commit()
        
        # Cache'i invalidate et
        from app.dlp.policy_manager import invalidate_policy_cache
        invalidate_policy_cache()
        
        return {"message": "Rule Set başarıyla güncellendi"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating rule set: {str(e)}")

@router.delete("/rule-sets/{rule_set_id}")
async def delete_rule_set(
    rule_set_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Rule Set'i sil"""
    try:
        rule_set = db.query(models.DlpRuleSet).filter(
            models.DlpRuleSet.id == rule_set_id
        ).first()
        
        if not rule_set:
            raise HTTPException(status_code=404, detail="Rule Set bulunamadı")
        
        # Önce kuralları sil
        db.query(models.DlpRuleSetRule).filter(
            models.DlpRuleSetRule.rule_set_id == rule_set_id
        ).delete()
        
        # Sonra rule set'i sil
        db.delete(rule_set)
        db.commit()
        
        # Cache'i invalidate et
        from app.dlp.policy_manager import invalidate_policy_cache
        invalidate_policy_cache()
        
        return {"message": "Rule Set başarıyla silindi"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting rule set: {str(e)}")

@router.post("/rule-sets/{rule_set_id}/toggle")
async def toggle_rule_set(
    rule_set_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_admin_role())
):
    """Rule Set'i aktif/pasif yap"""
    try:
        rule_set = db.query(models.DlpRuleSet).filter(
            models.DlpRuleSet.id == rule_set_id
        ).first()
        
        if not rule_set:
            raise HTTPException(status_code=404, detail="Rule Set bulunamadı")
        
        rule_set.is_active = not rule_set.is_active
        db.commit()
        
        # Cache'i invalidate et
        from app.dlp.policy_manager import invalidate_policy_cache
        invalidate_policy_cache()
        
        status = "aktif" if rule_set.is_active else "pasif"
        return {"message": f"Rule Set {status} hale getirildi"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error toggling rule set: {str(e)}")