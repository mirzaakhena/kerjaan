**Goal.** The Flutter app talks to the server, and Mirza can try it on his own Android phone.

**Then F2, changing the bank account.** The account a manager approves shows in Profile Info only once F1 reads the profile from the server.

- 261017065502 A partner requests and cancels a bank account change from the Flutter app, and the manager's decision on the dashboard reaches the phone

**Then revoked certificates in Skills Info.** It waits for nobody, but it changes the same Flutter profile files as F2, so it comes after it.

- 261017065504 A certificate revoked by an admin shows as revoked with its reason and is not counted, in the webapp and in Flutter

**Then F3, the shared account screens.** It closes the partner side before the institution flows begin.

- 261017073003 Partners and institutions change their password, see their activity history and message support from the Flutter app on the real server

**Then F4, the institution's account and My Institution.** The search after it uses institution IDs from the server.

- 261017073004 An institution sees its account verification, edits its personal info and manages My Institution from the Flutter app on the real server

**Then F5, partner search and detail.** The proposal wizard after it starts from this partner detail.

- 261017073005 An institution searches for partners and opens a partner's detail from the Flutter app with real partners on the server

**Then one reason code.** F6, payment and F7 build sample rejections of a reason, so the code must be final before them.

- 261017065505 A rejection for an empty or too long reason uses one code at the manager door and the contract door

**Then F6, the institution's proposals and contracts.** This ticket moves the institution's contracts to the server, so every contract step below waits for it.

- 261017073006 An institution creates a proposal until it is sent and sees its contracts in the contract list and detail of the Flutter app, on the real server

**Then mock payment and replacement partners.** Once paid and checked by a manager, a proposal from the institution's phone reaches the partner's phone.

- 261009225715 Flutter institution: payment, extra payment and replacement partner

**Then F7, extra time, cancelling and messages per contract.** It comes after payment because it shares the same institution contract files.

- 261017073007 An institution decides on extra time, cancels a contract and sends messages per contract from the Flutter app on the real server

**Then F8, codes, reports, closing and reviews.** After it, one job can be followed from start to finish on two phones.

- 261017073008 An institution issues the start code, reads reports, closes the job and leaves a review from the Flutter app on the real server

**Last, F9 Notifications.** Every link target of a notification is on the server by then.

- 261017073009 Notifications and notification settings in the Flutter app are read from the real server, for partners and institutions
