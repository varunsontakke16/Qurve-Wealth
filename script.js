const rotatingWords = [
  "Market Intelligence",
  "Capital Clarity",
  "Strategic Conviction",
  "Daily Alpha",
];

function setupRotatingHeadline() {
  const targets = document.querySelectorAll("[data-rotating-headline]");
  if (!targets.length) return;

  targets.forEach((target) => {
    let wordIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let wait = 0;

    function tick() {
      const currentWord = rotatingWords[wordIndex];

      if (!deleting) {
        charIndex += 1;
        target.textContent = currentWord.slice(0, charIndex);
        if (charIndex === currentWord.length) {
          deleting = true;
          wait = 16;
        }
      } else if (wait > 0) {
        wait -= 1;
      } else {
        charIndex -= 1;
        target.textContent = currentWord.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          wordIndex = (wordIndex + 1) % rotatingWords.length;
        }
      }

      const speed = deleting ? 46 : 76;
      setTimeout(tick, speed);
    }

    tick();
  });
}

function setupRevealOnScroll() {
  const reveals = document.querySelectorAll(".reveal");
  if (!reveals.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  reveals.forEach((el) => observer.observe(el));
}

function setupCounters() {
  const counters = document.querySelectorAll("[data-count-to]");
  if (!counters.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = Number(el.dataset.countTo);
        let current = 0;
        const step = Math.max(1, Math.round(target / 70));
        const suffix = el.dataset.suffix || "";

        const run = () => {
          current += step;
          if (current >= target) {
            el.textContent = `${target.toLocaleString()}${suffix}`;
            return;
          }
          el.textContent = `${current.toLocaleString()}${suffix}`;
          requestAnimationFrame(run);
        };
        run();
        observer.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((counter) => observer.observe(counter));
}

function setupBlogFilters() {
  const filters = document.querySelector(".filters");
  if (!filters || filters.dataset.blogFiltersBound === "1") return;
  filters.dataset.blogFiltersBound = "1";
  filters.addEventListener("click", (e) => {
    const button = e.target.closest("[data-filter]");
    if (!button) return;
    const value = button.dataset.filter;
    filters.querySelectorAll("[data-filter]").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    document.querySelectorAll("[data-category], [data-tags]").forEach((card) => {
      const list = (card.dataset.tags || card.dataset.category || "")
        .split(/\s+/)
        .filter(Boolean);
      const match = value === "all" || list.includes(value);
      if (match) {
        card.classList.remove("hidden");
      } else {
        card.classList.add("hidden");
      }
    });
  });
}

function setupCustomCursor() {
  const dot = document.createElement("div");
  const ring = document.createElement("div");
  dot.className = "cursor-dot";
  ring.className = "cursor-ring";
  document.body.append(dot, ring);

  if (window.matchMedia("(max-width: 900px)").matches) {
    dot.style.display = "none";
    ring.style.display = "none";
    return;
  }

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let ringX = x;
  let ringY = y;

  const interactive = "a, button, input, textarea, select, .card";

  document.addEventListener("mousemove", (event) => {
    x = event.clientX;
    y = event.clientY;
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
  });

  document.querySelectorAll(interactive).forEach((el) => {
    el.addEventListener("mouseenter", () => ring.classList.add("active"));
    el.addEventListener("mouseleave", () => ring.classList.remove("active"));
  });

  function animateRing() {
    ringX += (x - ringX) * 0.2;
    ringY += (y - ringY) * 0.2;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;
    requestAnimationFrame(animateRing);
  }
  animateRing();
}

function setupPageTransitions() {
  const links = document.querySelectorAll("a[href$='.html']");
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (link.target === "_blank") return;
      if (link.href === window.location.href) return;
      event.preventDefault();
      document.body.classList.add("page-out");
      setTimeout(() => {
        window.location.href = href;
      }, 280);
    });
  });
}

function setupHeroParallax() {
  const hero = document.querySelector(".hero");
  const orbOne = document.querySelector(".orb-1");
  const orbTwo = document.querySelector(".orb-2");
  if (!hero || !orbOne || !orbTwo) return;

  hero.addEventListener("mousemove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    orbOne.style.transform = `translate(${x * 0.03}px, ${y * 0.03}px)`;
    orbTwo.style.transform = `translate(${x * -0.02}px, ${y * -0.02}px)`;
  });
}

function setupSectionOrbs(sectionSelector, orbSelectors) {
  const section = document.querySelector(sectionSelector);
  if (!section) return;
  const orbs = orbSelectors.map((sel) => section.querySelector(sel)).filter(Boolean);
  if (orbs.length < 2) return;

  section.addEventListener("mousemove", (event) => {
    const rect = section.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    orbs.forEach((orb, i) => {
      const depth = 0.018 + i * 0.008;
      const dir = i % 2 === 0 ? 1 : -1;
      orb.style.transform = `translate(${x * depth * dir}px, ${y * depth * dir}px)`;
    });
  });
}

function setupFinanceToolDemo() {
  const runBtn = document.querySelector("[data-run-tool]");
  const output = document.querySelector("[data-tool-output]");
  if (!runBtn || !output) return;

  runBtn.addEventListener("click", () => {
    const principal = Number(document.querySelector("#principal")?.value || 0);
    const annualRate = Number(document.querySelector("#rate")?.value || 0) / 100;
    const years = Number(document.querySelector("#years")?.value || 0);
    const monthlyContribution = Number(document.querySelector("#monthly")?.value || 0);
    const months = years * 12;
    const monthlyRate = annualRate / 12;
    let total = principal;

    for (let i = 0; i < months; i += 1) {
      total = total * (1 + monthlyRate) + monthlyContribution;
    }

    const invested = principal + monthlyContribution * months;
    const gain = total - invested;
    output.innerHTML = `
      <strong>Projected Value: $${Math.round(total).toLocaleString()}</strong><br>
      Total Contributions: $${Math.round(invested).toLocaleString()}<br>
      Estimated Growth: $${Math.round(gain).toLocaleString()}
    `;
  });
}

function setupBrandScrollSwap() {
  const nav = document.querySelector(".top-nav");
  if (!nav) return;

  const brand = nav.querySelector(".brand-animated");
  if (!brand) return;

  const threshold = 60; // px scrolled
  let rafId = null;

  const update = () => {
    const compact = window.scrollY > threshold;
    nav.classList.toggle("compact", compact);
  };

  window.addEventListener(
    "scroll",
    () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    },
    { passive: true }
  );

  update();
}

function formatRupees(v) {
  try {
    return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v)}`;
  } catch {
    return `₹${v}`;
  }
}

function syncInvestNowRange(form) {
  const hidden = form.querySelector("#investment-value");
  const display = form.querySelector("#investment-value-display");
  if (!hidden) return;

  const selected = form.querySelector('input[name="investmentBracket"]:checked');
  const map = {
    lt25: 1250000,
    "25_50": 3750000,
    "50_75": 6250000,
    "75_100": 8750000,
    "1_3": 20000000,
    "3_5": 40000000,
  };
  const bracketVal = map[selected?.value];
  const clamped = Number.isFinite(bracketVal) ? bracketVal : Number(hidden.value) || 0;

  hidden.value = String(clamped);
  if (display) display.textContent = clamped >= 50000001 ? "5Cr+" : formatRupees(clamped);
}

function validateInvestNowForm(form) {
  const fullNameInput = form.querySelector("#full-name");
  const emailInput = form.querySelector("#email");
  const phoneInput = form.querySelector("#phone");
  const investmentRadios = form.querySelectorAll('input[name="investmentBracket"]');
  const selectedRadio = form.querySelector('input[name="investmentBracket"]:checked');
  const hiddenValue = form.querySelector("#investment-value");
  const messageInput = form.querySelector("#message");

  const setError = (key, text) => {
    const el = form.querySelector(`[data-error-for="${key}"]`);
    if (!el) return;
    el.textContent = text || "";
  };

  const clearErrors = () => {
    setError("fullName", "");
    setError("email", "");
    setError("phone", "");
    setError("investmentValue", "");
    setError("message", "");
    [fullNameInput, emailInput, phoneInput, messageInput, hiddenValue].forEach((x) => {
      if (!x) return;
      if (x === hiddenValue) return;
      x.removeAttribute("aria-invalid");
    });
    investmentRadios.forEach((r) => r.removeAttribute("aria-invalid"));
  };

  clearErrors();

  const errors = {};

  const fullName = (fullNameInput?.value || "").trim();
  if (fullName.length < 3) {
    errors.fullName = "Please enter your full name.";
  } else if (!/^[a-zA-Z\s.'-]+$/.test(fullName)) {
    errors.fullName = "Name can only include letters, spaces, and . - ' characters.";
  }

  const email = (emailInput?.value || "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    errors.email = "Please enter a valid email address.";
  }

  const rawPhone = (phoneInput?.value || "").trim();
  const digits = rawPhone.replace(/[^\d]/g, "");
  if (digits.length < 10 || digits.length > 15) {
    errors.phone = "Please enter a valid phone number (10 to 15 digits).";
  }

  const investmentValue = Number(hiddenValue?.value);
  const selected = Boolean(selectedRadio);
  if (!selected) {
    errors.investmentValue = "Please select your investment bracket.";
  } else if (!Number.isFinite(investmentValue) || investmentValue < 10000 || investmentValue > 60000000) {
    errors.investmentValue = "Please select a valid investment value (min 10k, max 5cr+).";
  }

  const message = (messageInput?.value || "").trim();
  if (message.length < 15) {
    errors.message = "Please share a bit more detail (at least 15 characters).";
  }

  if (Object.keys(errors).length) {
    setError("fullName", errors.fullName);
    setError("email", errors.email);
    setError("phone", errors.phone);
    setError("investmentValue", errors.investmentValue);
    setError("message", errors.message);

    if (errors.fullName) fullNameInput?.setAttribute("aria-invalid", "true");
    if (errors.email) emailInput?.setAttribute("aria-invalid", "true");
    if (errors.phone) phoneInput?.setAttribute("aria-invalid", "true");
    if (errors.message) messageInput?.setAttribute("aria-invalid", "true");
    if (errors.investmentValue) investmentRadios.forEach((r) => r.setAttribute("aria-invalid", "true"));
    return false;
  }

  return true;
}

function setupInvestNowForm() {
  const form = document.querySelector("#invest-form");
  if (!form) return;

  const radios = form.querySelectorAll('input[name="investmentBracket"]');
  radios.forEach((r) => {
    r.addEventListener("change", () => {
      syncInvestNowRange(form);
      validateInvestNowForm(form);
    });
  });

  // Validate as user types (so each field gets feedback).
  ["#full-name", "#email", "#phone", "#message"].forEach((sel) => {
    const el = form.querySelector(sel);
    if (!el) return;
    el.addEventListener("input", () => validateInvestNowForm(form), { passive: true });
    el.addEventListener("blur", () => validateInvestNowForm(form));
  });

  syncInvestNowRange(form);
}

function collectInvestNowPayload(form) {
  const fullNameInput = form.querySelector("#full-name");
  const emailInput = form.querySelector("#email");
  const phoneInput = form.querySelector("#phone");
  const hiddenValue = form.querySelector("#investment-value");
  const messageInput = form.querySelector("#message");

  const digits = (phoneInput?.value || "").trim().replace(/[^\d]/g, "");

  return {
    fullName: (fullNameInput?.value || "").trim(),
    email: (emailInput?.value || "").trim(),
    phone: digits,
    investmentValue: Number(hiddenValue?.value),
    message: (messageInput?.value || "").trim(),
  };
}

async function submitInvestNow(form) {
  const payload = collectInvestNowPayload(form);
  const res = await fetch("/api/invest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Submission failed");
  return data.response;
}

function setupForms() {
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = form.querySelector("[data-form-message]");

      let ok = true;
      if (form.id === "invest-form") {
        // Keep errors visible and stop the success message.
        ok = validateInvestNowForm(form);
        if (!ok) {
          if (message) message.textContent = "";
          return;
        }

        if (message) message.textContent = "Submitting…";
        try {
          await submitInvestNow(form);
        } catch (e) {
          if (message) message.textContent = e.message || "Submission failed";
          return;
        }
      }

      if (ok) {
        if (message) {
          message.textContent =
            "Thanks. Your details were captured. A strategist from Qurve Wealth will reach out soon.";
        }
        form.reset();
        if (form.id === "invest-form") syncInvestNowRange(form);
      }
    });
  });
}

function setupQurveWayPhilosophy() {
  const staggerWrap = document.querySelector("[data-qv-stagger]");
  const cards = document.querySelectorAll("[data-qv-reveal]");
  if (staggerWrap && cards.length) {
    cards.forEach((card, i) => {
      card.style.setProperty("--qv-stagger", `${i * 95}ms`);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.16 }
    );
    cards.forEach((c) => observer.observe(c));
  }

  const timeline = document.querySelector("[data-qv-timeline]");
  const steps = document.querySelectorAll("[data-qv-step]");
  if (!timeline || !steps.length) return;

  const stepObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        stepObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.32 }
  );
  steps.forEach((s) => stepObserver.observe(s));

  let raf = null;
  const updateLine = () => {
    raf = null;
    const rect = timeline.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    const start = rect.top + vh * 0.22;
    const end = rect.bottom - vh * 0.28;
    const raw = (vh - start) / Math.max(1, end - start);
    const clamped = Math.max(0, Math.min(1, raw));
    timeline.style.setProperty("--qv-progress", clamped.toFixed(4));
  };

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(updateLine);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  updateLine();
}

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("page-ready");
  setupRotatingHeadline();
  setupRevealOnScroll();
  setupCounters();
  setupBlogFilters();
  setupQurveWayPhilosophy();
  setupCustomCursor();
  setupPageTransitions();
  setupHeroParallax();
  setupSectionOrbs("#qv-how-it-works", [".orb-a", ".orb-b", ".orb-c", ".orb-d"]);
  setupInvestNowForm();
  setupFinanceToolDemo();
  setupForms();
  setupBrandScrollSwap();
});
