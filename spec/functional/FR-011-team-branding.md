---
id: FR-011
title: "Configure team branding"
type: FR
object: configuration
relationships:
  - target: "ix://switchback/squadlogic/US-004"
    type: "implements"
---

# [FR-011] Configure team branding

## Description

The system SHALL allow a user to configure team branding that is applied to exported schedules. The branding configuration SHALL include a team name, an optional logo image, a primary color, and a tertiary color. The system SHALL persist the branding configuration in DynamoDB so it is reused across sessions and exports. The system SHALL provide a color wheel control for color selection.

## Inputs

- `teamDisplayName` (string, required): The team name to display on exports (e.g., "Brighton Blazers")
- `logoFile` (file, optional): A logo image (PNG, JPG, or SVG). Maximum file size: 2 MB. Maximum dimensions: 500x500 px.
- `primaryColor` (string, required): Hex color code selected via color wheel (e.g., "#1E3A5F"). Default: "#333333".
- `tertiaryColor` (string, required): Hex color code selected via color wheel (e.g., "#FFFFFF"). Default: "#F5F5F5".

## Outputs

- A persisted branding configuration object containing:
  - `teamDisplayName` (string)
  - `logoUrl` (string or null): S3 URL of the uploaded logo, or null if no logo
  - `primaryColor` (string): Hex color code
  - `tertiaryColor` (string): Hex color code

## Behavior

- The system SHALL display a color wheel control for selecting primary and tertiary colors.
- The system SHALL validate that color values are valid 6-digit hex codes prefixed with `#`.
- The system SHALL validate that the logo file is PNG, JPG, or SVG format and does not exceed 2 MB.
- When a logo is uploaded, the system SHALL store it in S3 and persist the S3 URL in the branding configuration.
- When a logo is removed, the system SHALL delete the S3 object and set the logoUrl to null.
- The system SHALL persist the branding configuration in DynamoDB, keyed by the user's identity, so it is available across sessions.
- The system SHALL display a live preview of the branding as colors and logo are configured.
- When no branding has been configured, the system SHALL use the default colors (primaryColor "#333333", tertiaryColor "#F5F5F5") and no logo.

## Acceptance Criteria

| ID | Criteria | Verification |
|----|----------|--------------|
| FR-011-AC-1 | Given a user enters team name "Brighton Blazers" and selects colors via color wheel, the configuration is persisted and returned on subsequent reads | Test |
| FR-011-AC-2 | Given a user uploads a 1 MB PNG logo, the logo is stored in S3 and the logoUrl is persisted | Test |
| FR-011-AC-3 | Given a user uploads a 3 MB logo, the system rejects with a file size error | Test |
| FR-011-AC-4 | Given a user uploads a .gif file, the system rejects with a format error (only PNG, JPG, SVG) | Test |
| FR-011-AC-5 | Given primaryColor "#ZZZ", the system rejects with an invalid hex color error | Test |
| FR-011-AC-6 | Given no branding configured, the system returns default colors and null logoUrl | Test |
| FR-011-AC-7 | The color selection control is a visual color wheel, not a text input | Demonstration |
| FR-011-AC-8 | A live preview updates as the user changes colors and uploads a logo | Demonstration |

## Dependencies

- **Upstream**: [US-004](../usecase/US-004-export-and-customize.md) export and customize
- **Downstream**: [FR-009](./FR-009-export-pdf.md) PDF export (consumes branding for styled output)
