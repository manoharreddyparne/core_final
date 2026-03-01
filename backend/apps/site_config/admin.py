from django.contrib import admin
from .models import LandingContent, TeamMember


# ─── Landing Content (Singleton) ─────────────────────────────────────────────
@admin.register(LandingContent)
class LandingContentAdmin(admin.ModelAdmin):
    # TeamMember is managed as a separate admin (no FK needed for singleton)
    fieldsets = (
        ("🎨 Brand & Logo", {
            "fields": ("logo_url", "logo_alt", "favicon_url"),
            "description": "Upload your logo to any image host (Imgur, Cloudflare Images, S3) and paste the URL here.",
        }),
        ("🔍 SEO & Meta", {
            "fields": ("seo_title", "seo_description", "seo_og_image"),
        }),
        ("📣 Announcement Banner", {
            "fields": ("banner_enabled", "banner_type", "banner_text", "banner_link"),
            "description": "Enable to show a dismissible strip at the top of the landing page.",
        }),
        ("🦸 Hero Section", {
            "fields": ("hero_badge", "hero_heading", "hero_subtext", "hero_cta_primary", "hero_cta_secondary", "hero_bg_image"),
        }),
        ("📊 Live Stats Counters", {
            "fields": ("stats_enabled", "stat_active_users", "stat_placement_rate", "stat_institutions", "stat_ai_queries"),
            "description": "Values shown beneath the hero CTAs.",
        }),
        ("🚪 Portal Cards", {
            "fields": (
                "portal_student_title", "portal_student_desc",
                "portal_institution_title", "portal_institution_desc",
            ),
        }),
        ("ℹ️ About Section", {
            "fields": ("about_badge", "about_heading", "about_body", "about_bullets", "about_image"),
        }),
        ("⚡ Platform Feature Tiles", {
            "fields": (
                "feature_1_title", "feature_1_desc", "feature_1_icon",
                "feature_2_title", "feature_2_desc", "feature_2_icon",
                "feature_3_title", "feature_3_desc", "feature_3_icon",
                "feature_4_title", "feature_4_desc", "feature_4_icon",
                "feature_5_title", "feature_5_desc", "feature_5_icon",
                "feature_6_title", "feature_6_desc", "feature_6_icon",
            ),
            "description": "6 tiles shown in the 'Everything You Need' section.",
        }),
        ("👥 Team Section", {
            "fields": ("team_section_enabled", "team_section_heading", "team_section_subtext"),
            "description": "Enable the 'Our Team' section. Add members via Site Config → Team Members in the sidebar.",
        }),
        ("💬 Testimonials", {
            "fields": ("testimonials_enabled", "testimonials"),
            "classes": ("collapse",),
            "description": "Format:\nName: <name>\nRole: <role>\nQuote: <quote>\n(separate blocks with ---)",
        }),
        ("❓ FAQ", {
            "fields": ("faq_enabled", "faq_items"),
            "classes": ("collapse",),
            "description": "Format:\nQ: <question>\nA: <answer>\n(separate blocks with ---)",
        }),
        ("📄 Whitepaper", {
            "fields": ("whitepaper_heading", "whitepaper_subtext", "whitepaper_view_url", "whitepaper_pdf_url", "whitepaper_cover_image"),
        }),
        ("🔗 Navigation Links", {
            "fields": ("nav_links",),
            "description": "One per line: Label,href",
        }),
        ("👣 Footer & Contact", {
            "fields": (
                "footer_tagline", "contact_email", "contact_phone", "contact_address", "copyright_text",
            ),
        }),
        ("📲 Social Media Links", {
            "fields": ("social_twitter", "social_linkedin", "social_github", "social_youtube", "social_instagram"),
            "description": "Leave blank to hide the icon. Full URLs only.",
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        return ("updated_at",) if obj else ()

    def has_add_permission(self, request):
        return not LandingContent.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


# ─── Team Members ─────────────────────────────────────────────────────────────
@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display        = ("name", "role", "order", "is_visible")
    list_display_links  = ("name",)          # fix: 'name' is the link, so order is editable
    list_editable       = ("order", "is_visible")
    ordering            = ("order", "name")
    search_fields       = ("name", "role")
    fields              = ("order", "is_visible", "name", "role", "photo_url", "bio", "linkedin", "github", "twitter")
