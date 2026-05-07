(function () {
  const form = document.querySelector("[data-builder-form]");
  const output = document.querySelector("[data-markdown-output]");
  const status = document.querySelector("[data-status]");
  const copyButton = document.querySelector("[data-copy-markdown]");
  const downloadButton = document.querySelector("[data-download-markdown]");
  const clearButton = document.querySelector("[data-clear-form]");

  if (!form || !output) return;

  const optionSets = {
    asset_categories: [
      ["phone_camera", "Phone / camera"],
      ["audio", "Audio"],
      ["stabilisation", "Tripod / grip"],
      ["lighting", "Lighting"],
      ["projection", "Projection"],
      ["storage", "Storage"],
      ["software", "Software"],
      ["internet", "Internet"],
      ["transport", "Transport"],
      ["power", "Power"]
    ],
    shared_use: [
      ["event_coverage", "Event coverage"],
      ["outdoor_cinema", "Outdoor cinema"],
      ["interviews", "Interviews"],
      ["noticeboard_screens", "Noticeboard screens"],
      ["training", "Training"],
      ["editing", "Editing"],
      ["archive", "Archive"],
      ["live_updates", "Live updates"],
      ["grant_evidence", "Grant evidence"]
    ],
    wishlist_categories: [
      ["audio", "Audio"],
      ["phone_rigs", "Phone rigs"],
      ["camera", "Camera"],
      ["lighting", "Lighting"],
      ["projection", "Projection"],
      ["storage", "Storage"],
      ["power", "Power"],
      ["computers", "Computers"],
      ["software", "Software"],
      ["training", "Training"]
    ],
    roadmap_focus: [
      ["phone_first", "Phone-first"],
      ["team_kit", "Team kit"],
      ["events", "Events"],
      ["film_club", "Film club"],
      ["noticeboards", "Noticeboards"],
      ["grant_evidence", "Grant evidence"],
      ["ai_assistants", "AI assistants"],
      ["archive", "Archive"],
      ["training", "Training"]
    ],
    business_roles: [
      ["grant_applicant", "Grant applicant"],
      ["local_business", "Local business"],
      ["artist_or_maker", "Artist / maker"],
      ["event_host", "Event host"],
      ["community_group", "Community group"],
      ["club_or_sport", "Club / sport"],
      ["noticeboard_publisher", "Noticeboard publisher"],
      ["media_partner", "Media partner"],
      ["training_provider", "Training provider"],
      ["auspice_or_sponsor", "Auspice / sponsor"]
    ]
  };

  const builders = {
    business: {
      storageKey: "straddieBusinessProfile",
      fileName: "business-profile.md",
      build: buildBusinessMarkdown
    },
    asset: {
      storageKey: "straddieContentAssetList",
      fileName: "asset-list.md",
      build: buildAssetMarkdown
    },
    shared: {
      storageKey: "straddieSharedAssets",
      fileName: "shared-assets.md",
      build: buildSharedMarkdown
    },
    wishlist: {
      storageKey: "straddieEquipmentWishlist",
      fileName: "equipment-wishlist.md",
      build: buildWishlistMarkdown
    },
    roadmap: {
      storageKey: "straddieUpgradeRoadmap",
      fileName: "upgrade-roadmap.md",
      build: buildRoadmapMarkdown
    }
  };

  const kind = form.dataset.builderKind;
  const config = builders[kind];
  if (!config) return;

  function lines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function slugify(value) {
    return String(value || "example")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "example";
  }

  function today() {
    return new Date().toLocaleDateString("en-AU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  function yamlScalar(value) {
    const text = String(value || "TODO")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
    return '"' + text + '"';
  }

  function yamlList(items, indent) {
    const clean = items.filter(Boolean);
    if (!clean.length) return indent + "- TODO";
    return clean.map((item) => indent + "- " + yamlScalar(item)).join("\n");
  }

  function bulletList(items) {
    const clean = items.filter(Boolean);
    if (!clean.length) return "- TODO";
    return clean.map((item) => "- " + item).join("\n");
  }

  function section(title, body) {
    return ["## " + title, "", body || "- TODO", ""].join("\n");
  }

  function labelsFor(name, values) {
    const map = new Map((optionSets[name] || []).map(([value, label]) => [value, label]));
    return values.map((value) => map.get(value) || value);
  }

  function checkedValues(name) {
    return [...form.querySelectorAll('input[name="' + name + '"]:checked')].map((input) => input.value);
  }

  function renderOptionGroup(name, selected) {
    const mount = form.querySelector('[data-checkbox-group="' + name + '"]');
    if (!mount) return;
    mount.innerHTML = "";
    (optionSets[name] || []).forEach(([value, label]) => {
      const wrapper = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = name;
      input.value = value;
      input.checked = selected.includes(value);
      wrapper.append(input, " " + label);
      mount.appendChild(wrapper);
    });
  }

  function getState() {
    const state = {};
    [...form.elements].forEach((element) => {
      if (!element.name) return;
      if (element.type === "checkbox") {
        state[element.name] = checkedValues(element.name);
        return;
      }
      if (element.type === "radio") {
        if (element.checked) state[element.name] = element.value;
        return;
      }
      state[element.name] = element.value;
    });
    Object.keys(optionSets).forEach((name) => {
      if (form.querySelector('[data-checkbox-group="' + name + '"]')) state[name] = checkedValues(name);
    });
    return state;
  }

  function saveState() {
    sessionStorage.setItem(config.storageKey, JSON.stringify(getState()));
  }

  function readState() {
    try {
      return JSON.parse(sessionStorage.getItem(config.storageKey) || "{}");
    } catch (error) {
      return {};
    }
  }

  function restoreState(state) {
    Object.keys(optionSets).forEach((name) => renderOptionGroup(name, state[name] || []));
    [...form.elements].forEach((element) => {
      if (!element.name || element.type === "checkbox" || element.type === "radio") return;
      if (Object.prototype.hasOwnProperty.call(state, element.name)) {
        element.value = state[element.name];
      }
    });
  }

  function setStatus(message) {
    if (!status) return;
    status.textContent = message;
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
      status.textContent = "";
    }, 2800);
  }

  function linkedFamily() {
    return [
      "## Linked Markdown Family",
      "",
      "- Profile starter: https://auraofintelligence.github.io/sbt_profile_starter/",
      "- Aura builder: https://auraofintelligence.github.io/sbt_aura_builder/",
      "- Business profile builder: https://auraofintelligence.github.io/straddie-content-assets-kit/business-profile-builder.html",
      "- Public noticeboard builder: https://auraofintelligence.github.io/straddie-noticeboard-network/public-noticeboard-builder.html",
      "- Grant profile kit: https://auraofintelligence.github.io/stradbroke-grants-lab/profile-kit.html",
      "- Events and media: https://auraofintelligence.github.io/strange-but-true/events-media.html",
      "- Ready S.E.T. media: https://auraofintelligence.github.io/ready-set-co-op-hyperlocal-media/",
      ""
    ].join("\n");
  }

  function publicBoundary() {
    return [
      "## Public / Private Boundary",
      "",
      "- Public-safe capability can be shared after human review.",
      "- Private contacts, addresses, logins, expensive gear locations, protected places, cultural permissions, payment details and safety-sensitive information should stay out of public files.",
      "- A listed profile, role or asset is not consent to film, publish, borrow, sell, sponsor or access anything.",
      ""
    ].join("\n");
  }

  function buildBusinessMarkdown(state) {
    const publicName = state.public_name || "Example Applicant";
    const roles = labelsFor("business_roles", state.business_roles || []);
    return [
      "---",
      "schema: business_profile.v0",
      "status: draft_for_human_review",
      "public_name: " + yamlScalar(publicName),
      "legal_name: " + yamlScalar(state.legal_name),
      "abn_acn: " + yamlScalar(state.abn),
      "entity_type: " + yamlScalar(state.entity_type || "not_sure_yet"),
      "contact_person: " + yamlScalar(state.contact_person),
      "location_or_service_area: " + yamlScalar(state.location),
      "prepared_date: " + yamlScalar(today()),
      "applicant_roles:",
      yamlList(roles, "  "),
      "---",
      "",
      "# Business / Organisation Profile",
      "",
      "Use this file to give an AI agent, grant writer, partner or public-profile builder the basic truth before drafting.",
      "",
      section("Public Name", publicName),
      section("Legal Name", state.legal_name || "TODO"),
      section("ABN / ACN", state.abn || "TODO"),
      section("Entity Type", state.entity_type || "TODO"),
      section("Contact Person", state.contact_person || "TODO"),
      section("Location", state.location || "TODO"),
      section("Website / Social Links", bulletList(lines(state.links))),
      section("Public Summary", state.summary || "TODO"),
      section("Community Benefit", state.benefit || "TODO"),
      section("Experience / Past Work", state.experience || "TODO"),
      section("Useful Evidence", bulletList(lines(state.evidence))),
      section("Insurance / Compliance", state.compliance || "TODO"),
      section("Grant Restrictions", state.restrictions || "TODO"),
      section("Public Update Rules", state.public_updates || "TODO"),
      section("Private Notes", state.private_notes || "Keep this section out of public pages unless deliberately approved."),
      section("Open Questions", bulletList(lines(state.open_questions))),
      publicBoundary(),
      linkedFamily()
    ].join("\n");
  }

  function buildAssetMarkdown(state) {
    const owner = state.owner_name || "Example Creator";
    const categories = labelsFor("asset_categories", state.asset_categories || []);
    return [
      "---",
      "schema: content_asset_list.v0",
      "status: draft_for_human_review",
      "owner_name: " + yamlScalar(owner),
      "place_or_service_area: " + yamlScalar(state.place),
      "public_profile: " + yamlScalar(state.profile_link || "profiles/" + slugify(owner) + "/profile.md"),
      "prepared_date: " + yamlScalar(today()),
      "asset_categories:",
      yamlList(categories, "  "),
      "---",
      "",
      "# Asset List",
      "",
      "This file maps what one person, project or group can use now before asking for shared team gear or upgrades.",
      "",
      section("Current Content Purpose", state.purpose || "TODO"),
      section("Assets Already Available", bulletList(lines(state.owned_items))),
      section("Software, Accounts and Workflows", bulletList(lines(state.software))),
      section("Skills and Helpers", bulletList(lines(state.skills))),
      section("Access Boundaries", bulletList(lines(state.access_boundaries))),
      section("Known Gaps", bulletList(lines(state.gaps))),
      section("File Locations", bulletList(lines(state.file_locations))),
      section("Questions Before Sharing Publicly", bulletList(lines(state.open_questions))),
      publicBoundary(),
      linkedFamily()
    ].join("\n");
  }

  function buildSharedMarkdown(state) {
    const team = state.team_name || "Example Media Team";
    const sharedUse = labelsFor("shared_use", state.shared_use || []);
    return [
      "---",
      "schema: shared_content_assets.v0",
      "status: draft_for_human_review",
      "team_name: " + yamlScalar(team),
      "coordinator: " + yamlScalar(state.coordinator),
      "public_link: " + yamlScalar(state.public_link || "profiles/" + slugify(team) + "/profile.md"),
      "prepared_date: " + yamlScalar(today()),
      "shared_use_areas:",
      yamlList(sharedUse, "  "),
      "---",
      "",
      "# Shared Assets",
      "",
      "This file turns separate personal assets into a careful shared layer for local content creation.",
      "",
      section("Shared Purpose", state.shared_purpose || "TODO"),
      section("Shared Gear List", bulletList(lines(state.shared_items))),
      section("Shared Spaces, Screens or Venues", bulletList(lines(state.spaces))),
      section("Team Roles", bulletList(lines(state.roles))),
      section("Borrowing or Check-Out Rules", bulletList(lines(state.borrowing_rules))),
      section("Safety, Insurance and Power Notes", bulletList(lines(state.safety_notes))),
      section("Private or Permission-Needed Assets", bulletList(lines(state.private_assets))),
      section("Open Questions", bulletList(lines(state.open_questions))),
      publicBoundary(),
      linkedFamily()
    ].join("\n");
  }

  function buildWishlistMarkdown(state) {
    const project = state.project_name || "Example Equipment Wishlist";
    const categories = labelsFor("wishlist_categories", state.wishlist_categories || []);
    return [
      "---",
      "schema: equipment_wishlist.v0",
      "status: draft_for_human_review",
      "project_name: " + yamlScalar(project),
      "near_term_goal: " + yamlScalar(state.goal),
      "timeframe: " + yamlScalar(state.timeframe),
      "budget_style: " + yamlScalar(state.budget_style || "not_sure_yet"),
      "prepared_date: " + yamlScalar(today()),
      "upgrade_categories:",
      yamlList(categories, "  "),
      "---",
      "",
      "# Equipment Wishlist",
      "",
      "This file separates useful next upgrades from tempting purchases that should wait.",
      "",
      section("Requested Items", bulletList(lines(state.wish_items))),
      section("Borrow, Hire or In-Kind Options", bulletList(lines(state.borrow_options))),
      section("Do Not Buy Yet", bulletList(lines(state.delay_items))),
      section("Why These Upgrades Matter", state.justification || "TODO"),
      section("Who Benefits", bulletList(lines(state.beneficiaries))),
      section("Support Links", bulletList(lines(state.support_links))),
      section("Open Questions", bulletList(lines(state.open_questions))),
      publicBoundary(),
      linkedFamily()
    ].join("\n");
  }

  function buildRoadmapMarkdown(state) {
    const name = state.roadmap_name || "Example Upgrade Roadmap";
    const focus = labelsFor("roadmap_focus", state.roadmap_focus || []);
    return [
      "---",
      "schema: content_upgrade_roadmap.v0",
      "status: draft_for_human_review",
      "roadmap_name: " + yamlScalar(name),
      "prepared_date: " + yamlScalar(today()),
      "roadmap_focus:",
      yamlList(focus, "  "),
      "---",
      "",
      "# Upgrade Roadmap",
      "",
      "This file keeps upgrades staged: current kit first, team sharing second, reliable local production third, state-of-the-art experiments only when they serve the work.",
      "",
      section("Starting Point", state.starting_point || "TODO"),
      section("Target Capability", state.target_capability || "TODO"),
      section("Main Constraints", bulletList(lines(state.constraints))),
      section("Stage 1 - Use What I Have", state.stage_one || "TODO"),
      section("Stage 2 - Use What We Have", state.stage_two || "TODO"),
      section("Stage 3 - Reliable Local Production", state.stage_three || "TODO"),
      section("Stage 4 - Evolving With The State Of The Art", state.stage_four || "TODO"),
      section("Minimum Standards", bulletList(lines(state.standards))),
      section("Training Rhythm", bulletList(lines(state.training))),
      section("Triggers To Upgrade", bulletList(lines(state.upgrade_triggers))),
      section("Next Month Actions", bulletList(lines(state.next_actions))),
      publicBoundary(),
      linkedFamily()
    ].join("\n");
  }

  function updateOutput() {
    const state = getState();
    output.value = config.build(state);
    saveState();
  }

  form.addEventListener("input", updateOutput);
  form.addEventListener("change", updateOutput);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateOutput();
    setStatus("Markdown updated.");
  });

  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      updateOutput();
      try {
        await navigator.clipboard.writeText(output.value);
        setStatus("Markdown copied.");
      } catch (error) {
        output.select();
        document.execCommand("copy");
        setStatus("Markdown selected and copied.");
      }
    });
  }

  if (downloadButton) {
    downloadButton.addEventListener("click", () => {
      updateOutput();
      const blob = new Blob([output.value], { type: "text/markdown;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = config.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
      setStatus(config.fileName + " ready.");
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      sessionStorage.removeItem(config.storageKey);
      form.reset();
      Object.keys(optionSets).forEach((name) => {
        if (form.querySelector('[data-checkbox-group="' + name + '"]')) renderOptionGroup(name, []);
      });
      updateOutput();
      setStatus("Cleared.");
    });
  }

  restoreState(readState());
  updateOutput();
})();
