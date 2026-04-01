"""
QR Code processing routes
"""
import base64
import io
import re
import urllib.parse

from fastapi import APIRouter, HTTPException

from models.requests import QRCodeProcessRequest
from models.responses import QRCodeProcessResponse
from utils import logger


router = APIRouter(prefix="/api", tags=["qr"])


@router.post("/qr-code/process", response_model=QRCodeProcessResponse)
async def process_qr_code(request: QRCodeProcessRequest):
    """
    Process QR code image to extract UPI payment details
    
    Uses pyzbar library to decode QR code and extract UPI address and payment details
    """
    try:
        from PIL import Image
        
        # Decode base64 image
        try:
            image_data = base64.b64decode(request.image_base64.split(',')[-1])
            image = Image.open(io.BytesIO(image_data))
        except Exception as e:
            logger.error("qr_decode_error", error=str(e))
            return QRCodeProcessResponse(
                success=False,
                message="Failed to decode image" if request.language != "hi-IN" else "छवि डिकोड करने में विफल",
                error=str(e)
            )
        
        # Try to decode QR code
        try:
            # Try pyzbar first (backend library)
            try:
                from pyzbar.pyzbar import decode
                decoded_objects = decode(image)
            except ImportError:
                # pyzbar not available
                decoded_objects = []
            
            if not decoded_objects:
                # If pyzbar fails, return message asking for manual entry
                return QRCodeProcessResponse(
                    success=False,
                    message="QR code scanning requires vision model. Please enter UPI details manually." if request.language != "hi-IN" else "QR कोड स्कैनिंग के लिए विज़न मॉडल की आवश्यकता है। कृपया UPI विवरण मैन्युअल रूप से दर्ज करें।",
                    error="Vision model not configured"
                )
            
            # Extract data from QR code
            qr_data = decoded_objects[0].data.decode('utf-8')
            
            # Parse UPI QR code format
            # UPI QR codes typically contain: upi://pay?pa=<upi_id>&pn=<name>&am=<amount>&cu=INR
            upi_address = None
            amount = None
            merchant_name = None
            
            if 'upi://' in qr_data or 'UPI://' in qr_data:
                # Parse UPI QR code
                parsed = urllib.parse.urlparse(qr_data)
                params = urllib.parse.parse_qs(parsed.query)
                
                upi_address = params.get('pa', [None])[0]
                merchant_name = params.get('pn', [None])[0]
                amount_str = params.get('am', [None])[0]
                
                if amount_str:
                    try:
                        amount = float(amount_str)
                    except ValueError:
                        amount = None
            
            if not upi_address:
                # Try to extract UPI ID from QR data directly
                if '@' in qr_data:
                    # Look for UPI ID pattern
                    upi_match = re.search(r'([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)', qr_data)
                    if upi_match:
                        upi_address = upi_match.group(1)
            
            if upi_address:
                return QRCodeProcessResponse(
                    success=True,
                    upi_address=upi_address,
                    amount=amount,
                    merchant_name=merchant_name,
                    message="QR code processed successfully" if request.language != "hi-IN" else "QR कोड सफलतापूर्वक संसाधित"
                )
            else:
                return QRCodeProcessResponse(
                    success=False,
                    message="Could not extract UPI address from QR code" if request.language != "hi-IN" else "QR कोड से UPI पता निकाला नहीं जा सका",
                    error="No UPI address found"
                )
                
        except ImportError:
            # pyzbar not available
            logger.warning("pyzbar_not_available", message="Using AI service for QR code processing")
            
            return QRCodeProcessResponse(
                success=False,
                message="QR code library not available. Please enter UPI details manually." if request.language != "hi-IN" else "QR कोड लाइब्रेरी उपलब्ध नहीं है। कृपया UPI विवरण मैन्युअल रूप से दर्ज करें।",
                error="QR code library not installed"
            )
        except Exception as e:
            logger.error("qr_processing_error", error=str(e))
            return QRCodeProcessResponse(
                success=False,
                message=f"Failed to process QR code: {str(e)}" if request.language != "hi-IN" else f"QR कोड प्रसंस्करण विफल: {str(e)}",
                error=str(e)
            )
            
    except Exception as e:
        logger.error("qr_endpoint_error", error=str(e))
        return QRCodeProcessResponse(
            success=False,
            message=f"Error processing QR code: {str(e)}" if request.language != "hi-IN" else f"QR कोड प्रसंस्करण में त्रुटि: {str(e)}",
            error=str(e)
        )
