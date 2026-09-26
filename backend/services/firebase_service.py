import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class FirebaseAdminService:
    def __init__(self):
        self.firebase_initialized = False
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore, storage
            from backend.config import settings

            if not firebase_admin._apps:
                if settings.FIREBASE_CREDENTIALS_PATH and settings.FIREBASE_CREDENTIALS_PATH != "":
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                    firebase_admin.initialize_app(cred, {
                        'storageBucket': settings.FIREBASE_STORAGE_BUCKET
                    })
                    self.db = firestore.client()
                    self.bucket = storage.bucket()
                    self.firebase_initialized = True
                    logger.info("Firebase Admin SDK initialized successfully.")
        except Exception as e:
            logger.warning(f"Firebase Admin SDK initialization fallback: {str(e)}")

    def save_analysis_result(self, user_id: str, analysis_data: Dict[str, Any]) -> str:
        """
        Saves analysis result record to Firebase Firestore under users/{user_id}/analyses/{doc_id}.
        """
        doc_id = analysis_data.get("id") or f"ANALYSIS-{int(logging.time() if hasattr(logging, 'time') else 1000)}"
        if self.firebase_initialized and user_id:
            try:
                doc_ref = self.db.collection("users").document(str(user_id)).collection("analyses").document(str(doc_id))
                doc_ref.set(analysis_data, merge=True)
                logger.info(f"Analysis {doc_id} successfully saved to Firestore for user {user_id}")
                return doc_id
            except Exception as e:
                logger.error(f"Firestore save error for user {user_id}: {str(e)}")
        return doc_id

firebase_service = FirebaseAdminService()

