from django.db import models


class SingletonModel(models.Model):
    """Only one row allowed."""
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class LandingContent(SingletonModel):
    """All editable landing page copy + media — managed by Super Admin via Django Admin."""

    # ── Brand / Logo ────────────────────────────────────────────────────────
    logo_url        = models.URLField(
        blank=True, default="",
        help_text="Full URL to your logo image (PNG/SVG, recommended transparent background). Leave blank to show text logo."
    )
    logo_alt        = models.CharField(max_length=80, default="Nexora", help_text="Alt text for logo image.")
    favicon_url     = models.URLField(blank=True, default="", help_text="URL to 32×32 favicon (ICO or PNG).")

    # ── SEO ──────────────────────────────────────────────────────────────────
    seo_title       = models.CharField(max_length=120, default="Nexora – The Operating System for Higher Education")
    seo_description = models.TextField(default="Nexora connects students, faculty, and administration through AI-powered, zero-trust digital infrastructure.")
    seo_og_image    = models.URLField(blank=True, default="", help_text="Open Graph image (1200×630px recommended).")

    # ── Announcement Banner ──────────────────────────────────────────────────
    banner_enabled  = models.BooleanField(default=False, help_text="Show top-of-page announcement strip.")
    banner_text     = models.CharField(max_length=200, blank=True, default="")
    banner_link     = models.URLField(blank=True, default="", help_text="Optional URL the banner text links to.")
    banner_type     = models.CharField(
        max_length=20,
        choices=[("info", "Info (Blue)"), ("success", "Success (Green)"), ("warning", "Warning (Amber)")],
        default="info",
    )

    # ── Hero ─────────────────────────────────────────────────────────────────
    hero_badge         = models.CharField(max_length=120, default="Enterprise-Grade Academic Cloud")
    hero_heading       = models.TextField(default="The Operating System for Higher Education")
    hero_subtext       = models.TextField(
        default=(
            "Nexora connects students, faculty, and administration through an "
            "AI-powered, unified digital infrastructure. Experience zero-trust "
            "security and intelligent academic governance."
        )
    )
    hero_cta_primary   = models.CharField(max_length=80, default="Access Portals")
    hero_cta_secondary = models.CharField(max_length=80, default="Read Whitepaper")
    hero_bg_image      = models.URLField(
        blank=True, default="",
        help_text="Optional full-width hero background image URL. Leave blank for gradient glow."
    )

    # ── Live Stats ────────────────────────────────────────────────────────────
    stats_enabled       = models.BooleanField(default=True)
    stat_active_users   = models.CharField(max_length=20, default="4.2k")
    stat_placement_rate = models.CharField(max_length=20, default="98%")
    stat_institutions   = models.CharField(max_length=20, default="34+")
    stat_ai_queries     = models.CharField(max_length=20, default="1.2M")

    # ── Portal Cards ─────────────────────────────────────────────────────────
    portal_student_title     = models.CharField(max_length=80, default="Student Portal")
    portal_student_desc      = models.TextField(
        default="Access your academic records, intelligent resume studio, placement opportunities, and personalized AI assistant."
    )
    portal_institution_title = models.CharField(max_length=80, default="Institutional Gateway")
    portal_institution_desc  = models.TextField(
        default="Unified access for University Administrators and Faculty. Manage cohorts, analytics, and departmental governance."
    )

    # ── About ─────────────────────────────────────────────────────────────────
    about_badge   = models.CharField(max_length=120, default="Next-Generation Infrastructure")
    about_heading = models.TextField(default="Built for scale, designed for performance.")
    about_body    = models.TextField(
        default=(
            "Nexora replaces fragmented "
            "legacy systems with a singular, high-performance ecosystem. Powered by "
            "advanced Machine Learning analytics and robust Tenant Schema isolation, "
            "we ensure uncompromised data integrity."
        )
    )
    about_bullets = models.TextField(
        default=(
            "Multi-tenant architecture ensuring isolated data lakes.\n"
            "AI-driven talent discovery and placement matching.\n"
            "Automated verifiable credentials and dynamic portfolios.\n"
            "Real-time institutional health monitoring dashboards."
        ),
        help_text="One bullet per line."
    )
    about_image   = models.URLField(
        blank=True, default="",
        help_text="Optional image shown beside the About text (replaces the mock dashboard card)."
    )

    # ── Feature Tiles ─────────────────────────────────────────────────────────
    feature_1_title = models.CharField(max_length=80, default="AI Governance Brain")
    feature_1_desc  = models.TextField(default="Placement readiness scoring, at-risk detection, and auto-personalized mock assignments.")
    feature_1_icon  = models.CharField(max_length=40, default="Brain",   help_text="Lucide icon name (e.g. Brain, ShieldCheck, Users)")
    feature_2_title = models.CharField(max_length=80, default="Quantum Shield Auth")
    feature_2_desc  = models.TextField(default="Quad-Segment Cookie Fragmentation, HMAC key rotation, and device fingerprinting.")
    feature_2_icon  = models.CharField(max_length=40, default="ShieldCheck")
    feature_3_title = models.CharField(max_length=80, default="Multi-Tenant Isolation")
    feature_3_desc  = models.TextField(default="Every institution gets its own PostgreSQL schema. Cross-tenant queries are structurally impossible.")
    feature_3_icon  = models.CharField(max_length=40, default="Users")
    feature_4_title = models.CharField(max_length=80, default="Dynamic Eligibility Engine")
    feature_4_desc  = models.TextField(default="AND/OR/nested logic for placement drives. One-student-one-job enforcement built-in.")
    feature_4_icon  = models.CharField(max_length=40, default="BookOpen")
    feature_5_title = models.CharField(max_length=80, default="Real-Time Analytics")
    feature_5_desc  = models.TextField(default="WebSocket-driven dashboards for TPOs with placement stats, department-wise breakdowns.")
    feature_5_icon  = models.CharField(max_length=40, default="BarChart3")
    feature_6_title = models.CharField(max_length=80, default="Smart Resume Studio")
    feature_6_desc  = models.TextField(default="AI-powered resume builder with verifiable credentials and ATS scoring.")
    feature_6_icon  = models.CharField(max_length=40, default="FileText")

    # ── Testimonials ──────────────────────────────────────────────────────────
    testimonials_enabled = models.BooleanField(default=False)
    testimonials = models.TextField(
        blank=True, default="",
        help_text=(
            "Separate entries with ---\n"
            "Format:\nName: <name>\nRole: <role / institution>\nQuote: <quote text>"
        ),
    )

    # ── FAQ ───────────────────────────────────────────────────────────────────
    faq_enabled = models.BooleanField(default=False)
    faq_items   = models.TextField(
        blank=True, default="",
        help_text="Separate entries with ---\nFormat:\nQ: <question>\nA: <answer>",
    )

    # ── Whitepaper ────────────────────────────────────────────────────────────
    whitepaper_heading  = models.CharField(max_length=120, default="The Nexora Whitepaper")
    whitepaper_subtext  = models.TextField(
        default=(
            "Dive deep into our technical architecture, AI implementation frameworks, "
            "and the economic model of next-generation higher education systems."
        )
    )
    whitepaper_pdf_url  = models.URLField(blank=True, default="", help_text="Direct URL to the PDF file (used for Download button).")
    whitepaper_view_url = models.URLField(blank=True, default="/whitepaper.html", help_text="URL for the iframe viewer (set to /whitepaper.html to use the built-in page).")
    whitepaper_cover_image = models.URLField(blank=True, default="", help_text="Optional thumbnail shown when no view_url is set.")

    # ── Footer ────────────────────────────────────────────────────────────────
    footer_tagline  = models.CharField(max_length=200, default="Advancing global education through intelligent computing algorithms and robust infrastructure.")
    contact_email   = models.EmailField(default="contact@nexora.app")
    contact_phone   = models.CharField(max_length=30, blank=True, default="")
    contact_address = models.TextField(blank=True, default="")
    copyright_text  = models.CharField(max_length=200, default="© 2026 Nexora Foundation. All Systems Operational.")

    # Social links (empty → hidden)
    social_twitter  = models.URLField(blank=True, default="")
    social_linkedin = models.URLField(blank=True, default="")
    social_github   = models.URLField(blank=True, default="")
    social_youtube  = models.URLField(blank=True, default="")
    social_instagram= models.URLField(blank=True, default="")

    # ── Navigation ───────────────────────────────────────────────────────────
    nav_links = models.TextField(
        default="About,#about\nPlatform,#features\nTeam,#team\nWhitepaper,#whitepaper\nContact,#contact",
        help_text="One link per line: Label,href"
    )

    # ── Team Section ─────────────────────────────────────────────────────────
    team_section_enabled = models.BooleanField(default=False, help_text="Show the 'Our Team' section on the landing page.")
    team_section_heading = models.CharField(max_length=120, default="Built by a passionate team")
    team_section_subtext = models.CharField(max_length=300, default="Meet the people behind the platform.")

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Landing Page Content"

    def __str__(self):
        return "Landing Page Content"

    # ── Private parsers ───────────────────────────────────────────────────────
    def _parse_testimonials(self):
        result = []
        if not self.testimonials:
            return result
        for block in self.testimonials.split("---"):
            block = block.strip()
            if not block:
                continue
            entry: dict = {}
            for line in block.splitlines():
                if line.startswith("Name:"):
                    entry["name"]  = line[5:].strip()
                elif line.startswith("Role:"):
                    entry["role"]  = line[5:].strip()
                elif line.startswith("Quote:"):
                    entry["quote"] = line[6:].strip()
            if entry.get("name") and entry.get("quote"):
                result.append(entry)
        return result

    def _parse_faq(self):
        result = []
        if not self.faq_items:
            return result
        for block in self.faq_items.split("---"):
            block = block.strip()
            if not block:
                continue
            q = a = ""
            for line in block.splitlines():
                if line.startswith("Q:"):
                    q = line[2:].strip()
                elif line.startswith("A:"):
                    a = line[2:].strip()
            if q and a:
                result.append({"q": q, "a": a})
        return result

    def to_dict(self, team_members=None):
        bullets = [b.strip() for b in self.about_bullets.splitlines() if b.strip()]
        nav = []
        for line in self.nav_links.splitlines():
            parts = line.split(",", 1)
            if len(parts) == 2:
                nav.append({"label": parts[0].strip(), "href": parts[1].strip()})

        socials = {}
        for platform in ("twitter", "linkedin", "github", "youtube", "instagram"):
            val = getattr(self, f"social_{platform}", "")
            if val:
                socials[platform] = val

        return {
            "brand": {
                "logo_url":    self.logo_url,
                "logo_alt":    self.logo_alt,
                "favicon_url": self.favicon_url,
            },
            "seo": {
                "title":       self.seo_title,
                "description": self.seo_description,
                "og_image":    self.seo_og_image,
            },
            "banner": {
                "enabled": self.banner_enabled,
                "text":    self.banner_text,
                "link":    self.banner_link,
                "type":    self.banner_type,
            },
            "hero": {
                "badge":         self.hero_badge,
                "heading":       self.hero_heading,
                "subtext":       self.hero_subtext,
                "cta_primary":   self.hero_cta_primary,
                "cta_secondary": self.hero_cta_secondary,
                "bg_image":      self.hero_bg_image,
            },
            "stats": {
                "enabled":        self.stats_enabled,
                "active_users":   self.stat_active_users,
                "placement_rate": self.stat_placement_rate,
                "institutions":   self.stat_institutions,
                "ai_queries":     self.stat_ai_queries,
            },
            "portals": {
                "student":     {"title": self.portal_student_title,     "desc": self.portal_student_desc},
                "institution": {"title": self.portal_institution_title, "desc": self.portal_institution_desc},
            },
            "about": {
                "badge":   self.about_badge,
                "heading": self.about_heading,
                "body":    self.about_body,
                "bullets": bullets,
                "image":   self.about_image,
            },
            "features": [
                {"title": self.feature_1_title, "desc": self.feature_1_desc, "icon": self.feature_1_icon},
                {"title": self.feature_2_title, "desc": self.feature_2_desc, "icon": self.feature_2_icon},
                {"title": self.feature_3_title, "desc": self.feature_3_desc, "icon": self.feature_3_icon},
                {"title": self.feature_4_title, "desc": self.feature_4_desc, "icon": self.feature_4_icon},
                {"title": self.feature_5_title, "desc": self.feature_5_desc, "icon": self.feature_5_icon},
                {"title": self.feature_6_title, "desc": self.feature_6_desc, "icon": self.feature_6_icon},
            ],
            "testimonials": {
                "enabled": self.testimonials_enabled,
                "items":   self._parse_testimonials() if self.testimonials_enabled else [],
            },
            "faq": {
                "enabled": self.faq_enabled,
                "items":   self._parse_faq() if self.faq_enabled else [],
            },
            "whitepaper": {
                "heading":       self.whitepaper_heading,
                "subtext":       self.whitepaper_subtext,
                "pdf_url":       self.whitepaper_pdf_url,
                "view_url":      self.whitepaper_view_url or "/whitepaper.html",
                "cover_image":   self.whitepaper_cover_image,
            },
            "team": {
                "enabled": self.team_section_enabled,
                "heading": self.team_section_heading,
                "subtext": self.team_section_subtext,
                "members": [m.to_dict() for m in (team_members or [])],
            },
            "footer": {
                "tagline":        self.footer_tagline,
                "contact_email":  self.contact_email,
                "contact_phone":  self.contact_phone,
                "contact_address":self.contact_address,
                "copyright":      self.copyright_text,
                "socials":        socials,
            },
            "nav":        nav,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class TeamMember(models.Model):
    """
    Unlimited, ordered team member cards shown on the landing page.
    Managed via Django Admin (inline under Landing Content, or standalone).
    """
    name     = models.CharField(max_length=120)
    role     = models.CharField(max_length=120, help_text="e.g. Lead Architect & Founder")
    bio      = models.TextField(blank=True, default="", help_text="Short 1–2 sentence bio.")
    photo_url= models.URLField(
        blank=True, default="",
        help_text="Direct URL to a photo (square recommended, min 200×200px). Leave blank to show initials avatar."
    )
    linkedin = models.URLField(blank=True, default="")
    github   = models.URLField(blank=True, default="")
    twitter  = models.URLField(blank=True, default="")
    order    = models.PositiveIntegerField(default=0, help_text="Lower number = shown first.")
    is_visible = models.BooleanField(default=True, help_text="Uncheck to hide without deleting.")

    class Meta:
        ordering    = ["order", "name"]
        verbose_name = "Team Member"
        verbose_name_plural = "Team Members"

    def __str__(self):
        return f"{self.name} ({self.role})"

    def to_dict(self):
        return {
            "name":      self.name,
            "role":      self.role,
            "bio":       self.bio,
            "photo_url": self.photo_url,
            "linkedin":  self.linkedin,
            "github":    self.github,
            "twitter":   self.twitter,
        }

