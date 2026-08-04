document.addEventListener("DOMContentLoaded", function () {
  /* ===== Mobile nav toggle ===== */
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  const navCta = document.querySelector(".nav-cta");

  if (navToggle) {
    navToggle.addEventListener("click", function () {
      navToggle.classList.toggle("open");
      navLinks.classList.toggle("open");
      if (navCta) navCta.classList.toggle("open");
    });
  }

  /* ===== Active nav link ===== */
  const currentPage =
    window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(function (link) {
    const href = link.getAttribute("href");
    if (href === currentPage || (currentPage === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });

  /* ===== FAQ accordion ===== */
  document.querySelectorAll(".faq-question").forEach(function (question) {
    question.addEventListener("click", function () {
      const item = question.parentElement;
      const isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item").forEach(function (i) {
        i.classList.remove("open");
      });
      if (!isOpen) {
        item.classList.add("open");
      }
    });
  });

  /* ===== Shop filter ===== */
  const filterButtons = document.querySelectorAll(".shop-filter");
  const productCards = document.querySelectorAll(".product-card");

  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterButtons.forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");

      const filter = btn.getAttribute("data-filter");
      productCards.forEach(function (card) {
        if (filter === "all" || card.getAttribute("data-category") === filter) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  /* ===== Scroll reveal ===== */
  const revealElements = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealElements.forEach(function (el) {
    observer.observe(el);
  });

  /* ===== Contact form (demo) ===== */
  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const btn = contactForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = "Sending...";
      btn.disabled = true;
      setTimeout(function () {
        btn.textContent = "Message Sent! ✓";
        contactForm.reset();
        setTimeout(function () {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 2500);
      }, 1200);
    });
  }

  /* ===== Shop add to cart (demo) ===== */
  document.querySelectorAll(".product-add").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const original = btn.textContent;
      btn.textContent = "✓";
      btn.style.background = "var(--aquamarine)";
      btn.style.color = "var(--ink)";
      setTimeout(function () {
        btn.textContent = original;
        btn.style.background = "";
        btn.style.color = "";
      }, 1500);
    });
  });
});
