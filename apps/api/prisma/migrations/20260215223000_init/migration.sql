-- Enums
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "UserRole" AS ENUM ('CREATOR', 'ADMIN', 'ORG');
CREATE TYPE "PrimaryPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'X', 'LINKEDIN');
CREATE TYPE "Niche" AS ENUM ('FITNESS', 'TECH', 'FASHION', 'MUSIC', 'BUSINESS', 'EDUCATION', 'LIFESTYLE', 'COMEDY', 'GAMING', 'OTHER');
CREATE TYPE "FollowerTier" AS ENUM ('T1', 'T2', 'T3');
CREATE TYPE "Goal" AS ENUM ('FIRST_FOLLOWERS', 'BETTER_ENGAGEMENT', 'MONETIZE', 'AUTHORITY', 'SALES');
CREATE TYPE "GrowthStyle" AS ENUM ('DAILY_STEPS', 'COLLABORATION', 'TRENDS', 'DATA_LIGHT_GUIDANCE');
CREATE TYPE "AudienceRegion" AS ENUM ('LOCAL', 'AFRICA', 'GLOBAL', 'SPECIFIC_COUNTRY');
CREATE TYPE "StepStatus" AS ENUM ('ASSIGNED', 'COMPLETED', 'SKIPPED');
CREATE TYPE "InteractionAction" AS ENUM ('VIEW', 'SAVE', 'FEEDBACK', 'COLLAB_REQUEST');
CREATE TYPE "CampaignTier" AS ENUM ('T1', 'T2', 'T3');
CREATE TYPE "PayoutModel" AS ENUM ('BASE_BONUS', 'PERFORMANCE_ONLY');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'IN_REVIEW', 'PAID_OUT');
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'DISQUALIFIED');
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- Core user tables
CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "auth_provider_id" TEXT NOT NULL UNIQUE,
  "username" TEXT UNIQUE,
  "display_name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "role" "UserRole" NOT NULL DEFAULT 'CREATOR',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "creator_profile" (
  "user_id" UUID PRIMARY KEY,
  "primary_platform" "PrimaryPlatform" NOT NULL,
  "primary_niche" "Niche" NOT NULL,
  "secondary_niches" "Niche"[] NOT NULL DEFAULT ARRAY[]::"Niche"[],
  "follower_count" INTEGER NOT NULL,
  "follower_tier" "FollowerTier" NOT NULL,
  "goal" "Goal" NOT NULL,
  "growth_style" "GrowthStyle" NOT NULL,
  "audience_region" "AudienceRegion" NOT NULL,
  "audience_age_band" TEXT,
  "country" TEXT,
  "language" TEXT,
  "bio" TEXT,
  "photo_url" TEXT,
  "social_links" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "creator_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "creator_profile_primary_niche_idx" ON "creator_profile"("primary_niche");
CREATE INDEX "creator_profile_follower_tier_idx" ON "creator_profile"("follower_tier");
CREATE INDEX "creator_profile_country_idx" ON "creator_profile"("country");

CREATE TABLE "niche_catalog" (
  "id" SERIAL PRIMARY KEY,
  "key" "Niche" NOT NULL UNIQUE,
  "label" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "daily_steps" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "difficulty" INTEGER NOT NULL DEFAULT 1,
  "reward_points" INTEGER NOT NULL DEFAULT 5,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "target_goals" "Goal"[] NOT NULL DEFAULT ARRAY[]::"Goal"[],
  "target_growth_styles" "GrowthStyle"[] NOT NULL DEFAULT ARRAY[]::"GrowthStyle"[],
  "target_niches" "Niche"[] NOT NULL DEFAULT ARRAY[]::"Niche"[],
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "daily_steps_title_key" ON "daily_steps"("title");

CREATE TABLE "user_daily_steps" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "daily_step_id" UUID NOT NULL,
  "date_assigned" DATE NOT NULL,
  "status" "StepStatus" NOT NULL DEFAULT 'ASSIGNED',
  "evidence_url" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_daily_steps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_daily_steps_daily_step_id_fkey" FOREIGN KEY ("daily_step_id") REFERENCES "daily_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_daily_steps_unique" UNIQUE ("user_id", "daily_step_id", "date_assigned")
);

CREATE INDEX "user_daily_steps_user_date_idx" ON "user_daily_steps"("user_id", "date_assigned");

CREATE TABLE "streaks" (
  "user_id" UUID PRIMARY KEY,
  "current_streak" INTEGER NOT NULL DEFAULT 0,
  "longest_streak" INTEGER NOT NULL DEFAULT 0,
  "last_completed_date" DATE,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "interactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actor_user_id" UUID NOT NULL,
  "target_user_id" UUID NOT NULL,
  "action" "InteractionAction" NOT NULL,
  "meta" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interactions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "interactions_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "interactions_actor_created_idx" ON "interactions"("actor_user_id", "created_at");
CREATE INDEX "interactions_target_created_idx" ON "interactions"("target_user_id", "created_at");

CREATE TABLE "matches" (
  "user_id" UUID NOT NULL,
  "matched_user_id" UUID NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "reasons" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id", "matched_user_id"),
  CONSTRAINT "matches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "matches_matched_user_id_fkey" FOREIGN KEY ("matched_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "matches_user_score_idx" ON "matches"("user_id", "score");

CREATE TABLE "feed_cache" (
  "user_id" UUID PRIMARY KEY,
  "items" JSONB NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feed_cache_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Hustle Hub tables
CREATE TABLE "organizations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "contact_email" TEXT NOT NULL,
  "phone" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "organizations_contact_email_key" ON "organizations"("contact_email");

CREATE TABLE "campaigns" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "platform" "PrimaryPlatform" NOT NULL,
  "niche_target" "Niche" NOT NULL,
  "tier" "CampaignTier" NOT NULL,
  "min_followers" INTEGER NOT NULL,
  "max_followers" INTEGER,
  "required_deliverables" JSONB NOT NULL,
  "performance_weights" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "budget_total" INTEGER NOT NULL,
  "platform_fee_pct" INTEGER NOT NULL,
  "payout_model" "PayoutModel" NOT NULL,
  "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaigns_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "campaigns_title_key" ON "campaigns"("title");

CREATE INDEX "campaigns_status_start_date_idx" ON "campaigns"("status", "start_date");

CREATE TABLE "campaign_applications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_applications_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "campaign_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "campaign_applications_unique" UNIQUE ("campaign_id", "user_id")
);

CREATE INDEX "campaign_applications_user_status_idx" ON "campaign_applications"("user_id", "status");

CREATE TABLE "campaign_submissions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "proof_links" JSONB NOT NULL,
  "proof_media_urls" JSONB NOT NULL,
  "claimed_views" INTEGER NOT NULL DEFAULT 0,
  "claimed_likes" INTEGER NOT NULL DEFAULT 0,
  "claimed_comments" INTEGER,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "review_status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewer_notes" TEXT,
  CONSTRAINT "campaign_submissions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "campaign_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "campaign_submissions_unique" UNIQUE ("campaign_id", "user_id")
);

CREATE INDEX "campaign_submissions_campaign_review_idx" ON "campaign_submissions"("campaign_id", "review_status");

CREATE TABLE "campaign_metrics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "verified_views" INTEGER NOT NULL DEFAULT 0,
  "verified_likes" INTEGER NOT NULL DEFAULT 0,
  "verified_comments" INTEGER NOT NULL DEFAULT 0,
  "engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "authenticity_score" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "performance_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "payout_amount" INTEGER NOT NULL DEFAULT 0,
  "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_metrics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "campaign_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "campaign_metrics_unique" UNIQUE ("campaign_id", "user_id")
);

CREATE TABLE "payouts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payouts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "payouts_unique" UNIQUE ("campaign_id", "user_id")
);

CREATE INDEX "payouts_user_status_idx" ON "payouts"("user_id", "status");

CREATE TABLE "wallet_ledger" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "direction" "LedgerDirection" NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "ref_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "wallet_ledger_user_created_idx" ON "wallet_ledger"("user_id", "created_at");

-- Timestamp update trigger helper
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
CREATE TRIGGER trg_creator_profile_updated_at BEFORE UPDATE ON "creator_profile" FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
CREATE TRIGGER trg_daily_steps_updated_at BEFORE UPDATE ON "daily_steps" FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
CREATE TRIGGER trg_streaks_updated_at BEFORE UPDATE ON "streaks" FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON "organizations" FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON "campaigns" FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
