document.addEventListener('DOMContentLoaded', function() {
    initSmoothScroll();
    initGuideTabs();
    initDownloadTracking();
});

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

function initGuideTabs() {
    const tabs = document.querySelectorAll('.guide-tab');
    const sections = document.querySelectorAll('.guide-section');
    
    if (tabs.length === 0) return;
    
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            sections.forEach((section, sectionIndex) => {
                if (index === 0) {
                    section.style.display = 'block';
                } else {
                    const visibleSections = getVisibleSections(index);
                    section.style.display = visibleSections.includes(sectionIndex) ? 'block' : 'none';
                }
            });
        });
    });
    
    function getVisibleSections(tabIndex) {
        switch(tabIndex) {
            case 0: return [0, 1];
            case 1: return [1, 2];
            case 2: return [2, 3];
            case 3: return [3, 4];
            default: return [0, 1, 2, 3, 4];
        }
    }
}

function initDownloadTracking() {
    document.querySelectorAll('.btn-download').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const platform = this.closest('.download-card').querySelector('h3').textContent;
            console.log(`Download clicked: ${platform}`);
        });
    });
}

window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.boxShadow = 'none';
    }
});

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .feedback-card, .download-card').forEach(card => {
    observer.observe(card);
});