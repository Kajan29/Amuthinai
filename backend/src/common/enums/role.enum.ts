export enum Role {
  Donor = 'donor',
  Volunteer = 'volunteer',
  Recipient = 'recipient',
  Admin = 'admin',
}

/** Roles a user may pick for themselves during onboarding (FR1). Admins are provisioned. */
export const SELF_SERVICE_ROLES = [Role.Donor, Role.Volunteer, Role.Recipient] as const;
