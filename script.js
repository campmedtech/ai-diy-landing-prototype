const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const disclosureTimers = new WeakMap();

function setDisclosureState(trigger, panel, willOpen) {
  trigger.setAttribute("aria-expanded", String(willOpen));

  const pendingTimer = disclosureTimers.get(panel);
  if (pendingTimer) {
    window.clearTimeout(pendingTimer);
    disclosureTimers.delete(panel);
  }

  if (reduceMotion.matches) {
    panel.hidden = !willOpen;
    panel.style.height = willOpen ? "auto" : "0px";
    panel.style.opacity = willOpen ? "1" : "0";
    return;
  }

  if (willOpen) {
    panel.hidden = false;
    panel.style.height = "0px";
    panel.style.opacity = "0";
    panel.offsetHeight;
    panel.style.height = `${panel.scrollHeight}px`;
    panel.style.opacity = "1";

    disclosureTimers.set(
      panel,
      window.setTimeout(() => {
        if (trigger.getAttribute("aria-expanded") === "true") {
          panel.style.height = "auto";
        }
        disclosureTimers.delete(panel);
      }, 280),
    );
    return;
  }

  panel.style.height = `${panel.scrollHeight}px`;
  panel.offsetHeight;
  panel.style.height = "0px";
  panel.style.opacity = "0";

  disclosureTimers.set(
    panel,
    window.setTimeout(() => {
      if (trigger.getAttribute("aria-expanded") === "false") {
        panel.hidden = true;
        panel.style.height = "0px";
      }
      disclosureTimers.delete(panel);
    }, 280),
  );
}

document.querySelectorAll("[data-disclosure], .contact-trigger").forEach((trigger) => {
  const panel = document.getElementById(trigger.getAttribute("aria-controls"));
  if (!panel) return;

  trigger.addEventListener("click", () => {
    const willOpen = trigger.getAttribute("aria-expanded") === "false";
    setDisclosureState(trigger, panel, willOpen);
  });
});

const header = document.querySelector(".site-header");
const compactHeader = document.querySelector(".mobile-compact");
const mobileViewport = window.matchMedia("(max-width: 680px)");

function updateCompactHeader() {
  if (!header || !compactHeader) return;
  const shouldCompact = mobileViewport.matches && window.scrollY > 180;
  header.classList.toggle("is-compact", shouldCompact);
  compactHeader.setAttribute("aria-hidden", String(!shouldCompact));
  compactHeader.querySelectorAll("a, button").forEach((control) => {
    control.tabIndex = shouldCompact ? 0 : -1;
  });
}

let compactFrame;
window.addEventListener(
  "scroll",
  () => {
    if (compactFrame) return;
    compactFrame = window.requestAnimationFrame(() => {
      updateCompactHeader();
      compactFrame = undefined;
    });
  },
  { passive: true },
);
mobileViewport.addEventListener("change", updateCompactHeader);
updateCompactHeader();
