# Teams Identity and Sign-In

## Intent

Create a concise conceptual explainer for Microsoft 365 administrators, identity practitioners, and technical decision-makers. In about 45 seconds, viewers should be able to distinguish cloud-only from hybrid identity for Teams sign-in and explain why multifactor authentication should begin with privileged accounts and extend to everyone.

Proposed project slug: `teams-identity-sign-in`.

## Capability scan

- Brand package: no Microsoft package is registered under `config/org/brand-packages/`; governed Microsoft assets are available in the supplied Brand Central directory.
- Microsoft iconography: found. Relevant approved sources include Azure Public Service Icons V24, Fluent iconography, Microsoft corporate logos, and the supplied Microsoft 365 Copilot end-card package.
- User-supplied media: reference video found at `D:\OneDrive - Microsoft\00_PROJECT\knowledge to video\Kelly sample.mp4`; 73.87 seconds, 1920x1080, 30 fps, H.264 with stereo AAC.
- End card: found; 2.50 seconds, 1920x1080, 59.94 fps, ProRes 4444 XQ with alpha and stereo PCM audio.
- Image generation: unavailable in the live preflight. Not required for the proposed icon-led treatment.
- Neural narration: Azure Speech and Foundry TTS are unavailable in the live preflight because active credentials/configuration were not found. Windows SAPI is available as a free rough timing fallback, not a final-quality voice.
- Transcription: unavailable in the live preflight. Static caption timing can be finalized after narration access is restored.
- Music: no brand or organization music directory was found in the repo. Slate's built-in licensed library is available with 13 tracks; `neutral` and `corporate_technology` are the relevant candidates.

## Research grounding

- Teams uses modern authentication, and sign-in behavior can involve single-factor or multifactor authentication depending on organization policy.
- Cloud-only identities exist only in Microsoft Entra ID. Hybrid identities originate in on-premises Active Directory and are synchronized to Microsoft Entra ID.
- Hybrid password validation can occur through password hash synchronization in Microsoft Entra ID, pass-through authentication against on-premises AD DS, or federation through a trusted provider such as AD FS.
- Microsoft Entra multifactor authentication supports Microsoft Authenticator, software or hardware tokens, SMS, voice call, passkeys, Windows Hello for Business, and other methods.
- Microsoft guidance prioritizes MFA for privileged administrator accounts and recommends MFA protection for all users.
- Editorial accuracy note: "Entra ID checks the name and password. That's it." is too absolute because Microsoft Entra supports passwordless and other primary authentication methods. Recommended replacement: "Accounts live in Microsoft Entra ID, which handles sign-in in the cloud."

Sources:

- https://learn.microsoft.com/en-us/microsoftteams/sign-in-teams
- https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/whatis-azure-ad-connect
- https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/choose-ad-authn
- https://learn.microsoft.com/en-us/entra/identity/authentication/concept-mfa-howitworks
- https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-methods
- https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-planning
- https://learn.microsoft.com/en-us/entra/fundamentals/security-defaults

## Treatment

Use the Kelly reference's light, spacious Microsoft visual grammar: warm-white fields, pale-blue icon tiles, crisp black labels, and concepts assembled one element at a time. The video will not copy its Copilot-specific layout. Instead, a single sign-in request becomes the narrative spine and travels through two visibly different identity paths before gaining a second authentication factor.

The design scenes will be hand-stitched with HTML, SVG, and GSAP. Microsoft product and service assets will remain unmodified, proportionally sized, and labeled. Fluent glyphs will carry generic concepts such as person, password, server, phone, and shield. The approved Entra Connect and MFA service icons can appear as whole assets with wrapper-level fades or scale only. The supplied end card will play intact.

## Constraints

- Runtime: target 45 seconds including the 2.50-second end card. Preserving the user's exact narration at a natural pace may produce 46-48 seconds; this is a review decision, not a reason to time-compress speech.
- Script: 109 words, approximately 145 WPM over 45 seconds or 154 WPM if all narration must finish before the end card.
- Brand: use only supplied Microsoft or approved Fluent/Azure assets; do not redraw, recolor, crop, flip, rotate, or animate internal paths of Microsoft service icons and logos.
- Visual reference: inherit spacing, progressive assembly, restrained labels, and light-field tone from the Kelly sample.
- Captions: static, high-contrast blocks by default. On-screen labels will stay short to avoid duplicating narration.
- Output: 1920x1080, 30 fps master. The 59.94 fps end card will be conformed without changing its 2.50-second duration.
- Audience assumption: internal Microsoft 365 administrators and identity/security practitioners. Confirm or revise at this review.
- Cost to date: $0.00.