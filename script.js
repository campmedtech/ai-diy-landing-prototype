const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.querySelectorAll(".accordion-trigger").forEach((trigger) => {
  const panel = document.getElementById(trigger.getAttribute("aria-controls"));

  trigger.addEventListener("click", () => {
    const willOpen = trigger.getAttribute("aria-expanded") === "false";
    trigger.setAttribute("aria-expanded", String(willOpen));

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

      const finishOpen = (event) => {
        if (event.propertyName !== "height") return;
        panel.style.height = "auto";
        panel.removeEventListener("transitionend", finishOpen);
      };
      panel.addEventListener("transitionend", finishOpen);
      return;
    }

    panel.style.height = `${panel.scrollHeight}px`;
    panel.offsetHeight;
    panel.style.height = "0px";
    panel.style.opacity = "0";

    const finishClose = (event) => {
      if (event.propertyName !== "height") return;
      panel.hidden = true;
      panel.removeEventListener("transitionend", finishClose);
    };
    panel.addEventListener("transitionend", finishClose);
  });
});

document.querySelectorAll("[data-scroll-target]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(button.dataset.scrollTarget)?.scrollIntoView({
      behavior: reduceMotion.matches ? "auto" : "smooth",
      block: "start",
    });
  });
});
