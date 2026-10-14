// Game Rental Tracking System - Interactions & Dynamic Light Circle Spotlight

document.addEventListener('DOMContentLoaded', () => {
    // 1. Dynamic Light Circle Spotlight Tracking (GitHub Docs style)
    const spotlightElements = document.querySelectorAll('.has-spotlight, .item-card, .stat-item, .Box, .btn, .specular-button');

    spotlightElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            el.style.setProperty('--mouse-x', `${x}px`);
            el.style.setProperty('--mouse-y', `${y}px`);
        });

        el.addEventListener('mouseleave', () => {
            el.style.setProperty('--mouse-x', `50%`);
            el.style.setProperty('--mouse-y', `50%`);
        });
    });

    // 2. RubberSegment Catalog Interactive Filtering
    const catalogSegment = document.getElementById('catalog-platform-segment');
    if (catalogSegment) {
        catalogSegment.addEventListener('segment-change', (e) => {
            const platform = e.detail.value;
            const cards = document.querySelectorAll('.item-card[data-platform]');

            cards.forEach(card => {
                const cardPlatform = card.getAttribute('data-platform') || '';
                if (platform === 'All Platforms' || platform === 'All' || cardPlatform.includes(platform)) {
                    card.style.display = '';
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                } else {
                    card.style.display = 'none';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.96)';
                }
            });
        });
    }

    // RubberSegment sync for Rent page platform and priority
    const rentPlatformSeg = document.getElementById('rent-platform-segment');
    const platformSelect = document.getElementById('platform');
    if (rentPlatformSeg && platformSelect) {
        rentPlatformSeg.addEventListener('segment-change', (e) => {
            const val = e.detail.value;
            for (let i = 0; i < platformSelect.options.length; i++) {
                if (platformSelect.options[i].value === val) {
                    platformSelect.selectedIndex = i;
                    break;
                }
            }
        });
    }

    const rentPrioritySeg = document.getElementById('rent-priority-segment');
    const prioritySelect = document.getElementById('priority');
    if (rentPrioritySeg && prioritySelect) {
        rentPrioritySeg.addEventListener('segment-change', (e) => {
            const val = e.detail.value;
            for (let i = 0; i < prioritySelect.options.length; i++) {
                if (prioritySelect.options[i].value === val) {
                    prioritySelect.selectedIndex = i;
                    break;
                }
            }
        });
    }

    // Quick track preset listener
    const trackPreset = document.getElementById('track-preset-segment');
    const trackInput = document.getElementById('track-input-id');
    if (trackPreset && trackInput) {
        trackPreset.addEventListener('segment-change', (e) => {
            trackInput.value = e.detail.value;
            const form = document.getElementById('track-form');
            if (form) form.submit();
        });
    }

    // 6. Instant client-side search filter in Admin Dashboard table
    const adminSearch = document.getElementById('admin-search');
    if (adminSearch) {
        adminSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const rows = document.querySelectorAll('#rentals-table tbody tr');

            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(term)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
});

// Copy Tracking ID to clipboard function with tactile visual feedback
function copyTrackingId(id) {
    if (!id) return;
    navigator.clipboard.writeText(id).then(() => {
        const copyBtn = document.getElementById('copy-btn');
        if (copyBtn) {
            const originalText = copyBtn.innerText;
            copyBtn.innerText = 'Copied!';
            copyBtn.style.color = '#1a7f37';
            copyBtn.style.borderColor = 'rgba(26, 127, 55, 0.4)';
            setTimeout(() => {
                copyBtn.innerText = originalText;
                copyBtn.style.color = '';
                copyBtn.style.borderColor = '';
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}
