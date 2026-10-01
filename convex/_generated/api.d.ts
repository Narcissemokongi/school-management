/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as abonnements from "../abonnements.js";
import type * as absences from "../absences.js";
import type * as agora from "../agora.js";
import type * as anneesScolaires from "../anneesScolaires.js";
import type * as annonces from "../annonces.js";
import type * as appels from "../appels.js";
import type * as audit from "../audit.js";
import type * as classement from "../classement.js";
import type * as classes from "../classes.js";
import type * as cours from "../cours.js";
import type * as crons from "../crons.js";
import type * as ecoleNotes from "../ecoleNotes.js";
import type * as ecoles from "../ecoles.js";
import type * as eleves from "../eleves.js";
import type * as emails from "../emails.js";
import type * as emploiDuTemps from "../emploiDuTemps.js";
import type * as examens from "../examens.js";
import type * as fautes from "../fautes.js";
import type * as fcm from "../fcm.js";
import type * as fcmHelpers from "../fcmHelpers.js";
import type * as frais from "../frais.js";
import type * as helpers_auth from "../helpers/auth.js";
import type * as helpers_email from "../helpers/email.js";
import type * as helpers_permissions from "../helpers/permissions.js";
import type * as impersonation from "../impersonation.js";
import type * as inscriptions from "../inscriptions.js";
import type * as messages from "../messages.js";
import type * as migrations_normalizeMessageDates from "../migrations/normalizeMessageDates.js";
import type * as migrations_repairMessageAttachments from "../migrations/repairMessageAttachments.js";
import type * as notes from "../notes.js";
import type * as parentLinks from "../parentLinks.js";
import type * as propositionsPassage from "../propositionsPassage.js";
import type * as punitions from "../punitions.js";
import type * as rateLimit from "../rateLimit.js";
import type * as sanctions from "../sanctions.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as statistiques from "../statistiques.js";
import type * as stats from "../stats.js";
import type * as twoFactorEmail from "../twoFactorEmail.js";
import type * as users from "../users.js";
import type * as utils_crypto from "../utils/crypto.js";
import type * as utils_push from "../utils/push.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  abonnements: typeof abonnements;
  absences: typeof absences;
  agora: typeof agora;
  anneesScolaires: typeof anneesScolaires;
  annonces: typeof annonces;
  appels: typeof appels;
  audit: typeof audit;
  classement: typeof classement;
  classes: typeof classes;
  cours: typeof cours;
  crons: typeof crons;
  ecoleNotes: typeof ecoleNotes;
  ecoles: typeof ecoles;
  eleves: typeof eleves;
  emails: typeof emails;
  emploiDuTemps: typeof emploiDuTemps;
  examens: typeof examens;
  fautes: typeof fautes;
  fcm: typeof fcm;
  fcmHelpers: typeof fcmHelpers;
  frais: typeof frais;
  "helpers/auth": typeof helpers_auth;
  "helpers/email": typeof helpers_email;
  "helpers/permissions": typeof helpers_permissions;
  impersonation: typeof impersonation;
  inscriptions: typeof inscriptions;
  messages: typeof messages;
  "migrations/normalizeMessageDates": typeof migrations_normalizeMessageDates;
  "migrations/repairMessageAttachments": typeof migrations_repairMessageAttachments;
  notes: typeof notes;
  parentLinks: typeof parentLinks;
  propositionsPassage: typeof propositionsPassage;
  punitions: typeof punitions;
  rateLimit: typeof rateLimit;
  sanctions: typeof sanctions;
  seed: typeof seed;
  settings: typeof settings;
  statistiques: typeof statistiques;
  stats: typeof stats;
  twoFactorEmail: typeof twoFactorEmail;
  users: typeof users;
  "utils/crypto": typeof utils_crypto;
  "utils/push": typeof utils_push;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
