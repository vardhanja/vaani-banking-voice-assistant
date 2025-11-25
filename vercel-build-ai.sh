#!/bin/bash
# Vercel build script for AI Backend
# Uses minimal requirements to reduce deployment size
# Includes limited PDFs for RAG (2 loans + 1 investment)

set -euo pipefail

echo "🔧 AI Backend build script starting..."

# Remove ChromaDB files to reduce size (they'll be rebuilt on first use from PDFs)
echo "🗑️  Removing ChromaDB vector database files (will be rebuilt on first use)..."
rm -rf ai/chroma_db/*/data_level*.bin
rm -rf ai/chroma_db/*/header.bin
rm -rf ai/chroma_db/*/length.bin
rm -rf ai/chroma_db/*/link_lists.bin
find ai/chroma_db -name "*.bin" -delete 2>/dev/null || true
find ai/chroma_db -name "*.sqlite3" -delete 2>/dev/null || true
echo "✅ ChromaDB files removed (will be rebuilt from PDFs on first use)"

# Keep only essential PDFs for RAG (2 loans + 1 investment)
echo "📚 Keeping only essential PDFs for RAG..."
LOAN_PDFS_DIR="backend/documents/loan_products"
INVEST_PDFS_DIR="backend/documents/investment_schemes"

# Keep only 2 loan PDFs: home_loan and personal_loan (most common)
if [ -d "$LOAN_PDFS_DIR" ]; then
    cd "$LOAN_PDFS_DIR"
    # List of PDFs to keep
    KEEP_LOANS=("home_loan_product_guide.pdf" "personal_loan_product_guide.pdf")
    # Remove all PDFs that are not in the keep list
    for pdf in *.pdf; do
        if [ -f "$pdf" ]; then
            KEEP=false
            for keep_pdf in "${KEEP_LOANS[@]}"; do
                if [ "$pdf" = "$keep_pdf" ]; then
                    KEEP=true
                    break
                fi
            done
            if [ "$KEEP" = false ]; then
                rm -f "$pdf" 2>/dev/null || true
            fi
        fi
    done
    cd - > /dev/null
    echo "✅ Kept loan PDFs: home_loan_product_guide.pdf, personal_loan_product_guide.pdf"
fi

# Keep only 1 investment PDF: PPF (most common)
if [ -d "$INVEST_PDFS_DIR" ]; then
    cd "$INVEST_PDFS_DIR"
    # Remove all PDFs except PPF
    for pdf in *.pdf; do
        if [ -f "$pdf" ] && [ "$pdf" != "ppf_scheme_guide.pdf" ]; then
            rm -f "$pdf" 2>/dev/null || true
        fi
    done
    cd - > /dev/null
    echo "✅ Kept investment PDF: ppf_scheme_guide.pdf"
fi

# Copy minimal requirements for Vercel
echo "📄 Using minimal requirements for OpenAI-only deployment..."
cp ai/requirements-vercel.txt requirements.txt

echo "✅ Build configuration ready"
echo "   Using: ai/requirements-vercel.txt"
echo "   RAG enabled with: 2 loan PDFs + 1 investment PDF"
echo "   Vector store will be built on first use using OpenAI embeddings"

