from app.db.session import SessionLocal
from app.db import models
from app.dlp.policy import BLOCK_ENTITIES, MASK_ENTITIES
import uuid
from datetime import datetime

def create_default_dlp_policies():
    """Mevcut DLP entity'leri temel alan varsayılan politikalar oluştur"""
    db = SessionLocal()
    try:
        # Admin kullanıcısını bul
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin_user:
            print("Admin kullanıcısı bulunamadı. Önce seed_roles_users.py çalıştırın.")
            return

        # Mevcut politika sayısını kontrol et
        existing_policies = db.query(models.DlpPolicyRule).count()
        if existing_policies > 0:
            print(f"Zaten {existing_policies} adet politika mevcut. Yeni politikalar ekleniyor...")

        # BLOCK entity'leri için yüksek öncelikli politikalar
        for entity in BLOCK_ENTITIES:
            existing = db.query(models.DlpPolicyRule).filter(
                models.DlpPolicyRule.entity_type == entity,
                models.DlpPolicyRule.action == "block"
            ).first()
            
            if not existing:
                policy = models.DlpPolicyRule(
                    id=str(uuid.uuid4()),
                    name=f"Block {entity}",
                    entity_type=entity,
                    action="block",
                    priority=90,  # Yüksek öncelik
                    description=f"Automatically block {entity} entities for security",
                    config_json={
                        "threshold": 0.8,
                        "auto_created": True,
                        "entity_category": "high_risk"
                    },
                    is_active=True,
                    created_by=admin_user.id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(policy)
                print(f"Created BLOCK policy for {entity}")

        # MASK entity'leri için orta öncelikli politikalar
        for entity in MASK_ENTITIES:
            existing = db.query(models.DlpPolicyRule).filter(
                models.DlpPolicyRule.entity_type == entity,
                models.DlpPolicyRule.action == "mask"
            ).first()
            
            if not existing:
                policy = models.DlpPolicyRule(
                    id=str(uuid.uuid4()),
                    name=f"Mask {entity}",
                    entity_type=entity,
                    action="mask",
                    priority=50,  # Orta öncelik
                    description=f"Automatically mask {entity} entities for privacy",
                    config_json={
                        "threshold": 0.7,
                        "auto_created": True,
                        "entity_category": "medium_risk",
                        "mask_pattern": "***"
                    },
                    is_active=True,
                    created_by=admin_user.id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(policy)
                print(f"Created MASK policy for {entity}")

        # Genel allow politikası (en düşük öncelik)
        general_allow = db.query(models.DlpPolicyRule).filter(
            models.DlpPolicyRule.name == "General Allow Policy"
        ).first()
        
        if not general_allow:
            policy = models.DlpPolicyRule(
                id=str(uuid.uuid4()),
                name="General Allow Policy",
                entity_type="*",  # Tüm entity'ler
                action="allow",
                priority=1,  # En düşük öncelik
                description="Default allow policy for unmatched entities",
                config_json={
                    "auto_created": True,
                    "entity_category": "low_risk",
                    "default_policy": True
                },
                is_active=True,
                created_by=admin_user.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(policy)
            print("Created General Allow Policy")

        db.commit()
        
        # Oluşturulan politika sayısını göster
        total_policies = db.query(models.DlpPolicyRule).count()
        print(f"\nToplam {total_policies} adet DLP politikası mevcut.")
        
        # Cache'i invalidate et
        try:
            from app.dlp.policy_manager import invalidate_policy_cache
            invalidate_policy_cache()
            print("Policy cache invalidated.")
        except Exception as e:
            print(f"Cache invalidation failed: {e}")

    except Exception as e:
        print(f"Error creating default policies: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_default_dlp_policies()