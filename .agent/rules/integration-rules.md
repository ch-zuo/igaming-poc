{\rtf1\ansi\ansicpg1252\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\froman\fcharset0 Times-Bold;\f1\froman\fcharset0 Times-Roman;}
{\colortbl;\red255\green255\blue255;\red0\green0\blue0;\red91\green91\blue91;\red144\green1\blue18;
\red0\green0\blue255;}
{\*\expandedcolortbl;;\cssrgb\c0\c0\c0;\cssrgb\c43137\c43137\c43137;\cssrgb\c63922\c8235\c8235;
\cssrgb\c0\c0\c100000;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\deftab720
\pard\pardeftab720\partightenfactor0

\f0\b\fs48 \cf0 \expnd0\expndtw0\kerning0
\outl0\strokewidth0 \strokec2 Fast Track Native iGaming Integration \'e2\'80\'93
\f1\b0\fs24 \

\f0\b\fs48 Developer Guide (Complete & Merged)
\f1\b0\fs24 \
\pard\pardeftab720\partightenfactor0

\f0\b\fs36 \cf0 1. Purpose
\f1\b0\fs24 \
This document is the 
\f0\b single, authoritative developer guide
\f1\b0  for building an iGaming integration\
platform that is 
\f0\b fully compatible with Fast Track CRM
\f1\b0 .\
It merges: - Core iGaming platform responsibilities (PAM, wallet, bonus, sessions) - Fast Track 
\f0\b Operator
\f1\b0 \
\pard\pardeftab720\partightenfactor0

\f0\b \cf0 API
\f1\b0  requirements - Fast Track 
\f0\b Real-Time CRM Integration API
\f1\b0  (REST) - Extended real-time events\
(casino, bonus, balance) - A practical 
\f0\b PoC implementation guide
\f1\b0 \
Audience: 
\f0\b platform engineers, backend developers, and solution architects
\f1\b0 .\
\pard\pardeftab720\partightenfactor0

\f0\b\fs36 \cf0 2. Integration Philosophy (Fast Track Native)
\f1\b0\fs24 \
Fast Track CRM is a 
\f0\b real-time, event-driven system
\f1\b0 .\
Your platform: - Owns the 
\f0\b source of truth
\f1\b0  (players, balances, bets, bonuses) - Emits 
\f0\b real-time,
\f1\b0 \
\pard\pardeftab720\partightenfactor0

\f0\b \cf0 immutable events
\f1\b0  - Exposes 
\f0\b Operator APIs
\f1\b0  Fast Track can call\
Fast Track: - Builds player timelines - Performs segmentation - Triggers CRM campaigns\
Fast Track never validates wallet math or game logic.\
\pard\pardeftab720\partightenfactor0

\f0\b\fs36 \cf0 3. Core Platform Components (You Own)
\f1\b0\fs24 \
\'e2\'80\'a2 Player Account Management (PAM)\
\'e2\'80\'a2 Wallet Service\
\'e2\'80\'a2 Bonus Engine\
\'e2\'80\'a2 Game Session Manager\
\'e2\'80\'a2 Provider Adapter API\
\'e2\'80\'a2 Event Stream / Integration Layer\

\f0\b\fs36 4. Operator API \'e2\'80\'93 Required Endpoints
\f1\b0\fs24 \
Fast Track calls these endpoints to fetch authoritative operator data or trigger actions. All endpoints\
must be authenticated (API key or OAuth2).\
\pard\pardeftab720\partightenfactor0

\f0\b\fs28 \cf0 4.1 User Details API
\f1\b0\fs24 \
\pard\pardeftab720\partightenfactor0
\cf3 \strokec3 1\cf0 \strokec2 GET /operator/user-details/\{user_id\}\
\{\
"player_id": \cf4 \strokec4 "12345"\cf0 \strokec2 ,\
"email": \cf4 \strokec4 "user@example.com"\cf0 \strokec2 ,\
"first_name": \cf4 \strokec4 "Jane"\cf0 \strokec2 ,\
"last_name": \cf4 \strokec4 "Doe"\cf0 \strokec2 ,\
"country": \cf4 \strokec4 "SE"\cf0 \strokec2 ,\
"currency": \cf4 \strokec4 "EUR"\cf0 \strokec2 ,\
"registered_at": \cf4 \strokec4 "2026-01-02T12:00:00Z"\cf0 \strokec2 \
\}\
Used by Fast Track after registrations, logins, and user updates.\
\pard\pardeftab720\partightenfactor0

\f0\b\fs28 \cf0 4.2 Player Blocks API
\f1\b0\fs24 \
GET /operator/player-blocks/\{user_id\}\
\{\
"player_id": \cf4 \strokec4 "12345"\cf0 \strokec2 ,\
"is_blocked": \cf5 \strokec5 true\cf0 \strokec2 ,\
"block_reasons": [\cf4 \strokec4 "self_exclusion"\cf0 \strokec2 , \cf4 \strokec4 "timeout"\cf0 \strokec2 ]\
\}\
Used for responsible gaming and operational compliance.\

\f0\b\fs28 4.3 User Consents API
\f1\b0\fs24 \
GET /operator/consents/\{user_id\}\
\{\
"player_id": \cf4 \strokec4 "12345"\cf0 \strokec2 ,\
"email_opt_in": \cf5 \strokec5 true\cf0 \strokec2 ,\
"sms_opt_in": \cf5 \strokec5 false\cf0 \strokec2 ,\
"push_opt_in": \cf5 \strokec5 true\cf0 \strokec2 \
\}\
Fast Track relies on this endpoint for communication permissions.\
\pard\pardeftab720\partightenfactor0
\cf3 \strokec3 2
\f0\b\fs28 \cf0 \strokec2 4.4 Bonus Crediting API
\f1\b0\fs24 \
Called by Fast Track CRM campaigns.\
POST /operator/bonus-credit\
\{\
"player_id": \cf4 \strokec4 "12345"\cf0 \strokec2 ,\
"bonus_id": \cf4 \strokec4 "welcome_bonus_50"\cf0 \strokec2 ,\
"amount": 50.0,\
"metadata": \{\}\
\}\
Your platform must credit the bonus and emit bonus lifecycle events.\
\pard\pardeftab720\partightenfactor0

\f0\b\fs36 \cf0 5. Wallet Integration (Authoritative)
\f1\b0\fs24 \
\pard\pardeftab720\partightenfactor0

\f0\b\fs28 \cf0 5.1 Wallet Responsibilities
\f1\b0\fs24 \
\'e2\'80\'a2 Deposits\
\'e2\'80\'a2 Withdrawals\
\'e2\'80\'a2 Bets\
\'e2\'80\'a2 Wins\
\'e2\'80\'a2 Rollbacks\
Rules: - Unique immutable transaction_id - Fully idempotent APIs - Rollbacks must reference\
original transactions\
\pard\pardeftab720\partightenfactor0

\f0\b\fs36 \cf0 6. Bonus Engine Integration
\f1\b0\fs24 \
Fast Track reacts to 
\f0\b bonus lifecycle events
\f1\b0 , not calculations.\
Mandatory events: - bonus_granted - bonus_wagering_progress - bonus_completed -\
bonus_cancelled\

\f0\b\fs36 7. Game Session Management
\f1\b0\fs24 \
Game sessions must exist before gameplay.\
Attributes: - session_id - player_id - game_id - provider - started_at\
Events: - game_session_started - game_session_ended\
\pard\pardeftab720\partightenfactor0
\cf3 \strokec3 3
\f0\b\fs36 \cf0 \strokec2 8. Real-Time CRM Integration API (REST)
\f1\b0\fs24 \
Your platform must send 
\f0\b real-time REST events
\f1\b0  to Fast Track.\
\pard\pardeftab720\partightenfactor0

\f0\b\fs28 \cf0 8.1 Registrations
\f1\b0\fs24 \
POST /v2/integration/user\
\{\
"user_id": \cf4 \strokec4 "player_123"\cf0 \strokec2 ,\
"timestamp": \cf4 \strokec4 "2026-01-01T12:00:00Z"\cf0 \strokec2 ,\
"origin": \cf4 \strokec4 "casino.example.com"\cf0 \strokec2 ,\
"ip_address": \cf4 \strokec4 "203.0.113.5"\cf0 \strokec2 \
\}\

\f0\b\fs28 8.2 Login
\f1\b0\fs24 \
POST /v2/integration/login\
\{\
"user_id": \cf4 \strokec4 "player_123"\cf0 \strokec2 ,\
"timestamp": \cf4 \strokec4 "2026-01-01T12:30:00Z"\cf0 \strokec2 ,\
"origin": \cf4 \strokec4 "casino.example.com"\cf0 \strokec2 ,\
"is_impersonated": \cf5 \strokec5 false\cf0 \strokec2 \
\}\

\f0\b\fs28 8.3 User Consents Update
\f1\b0\fs24 \
PUT /v2/integration/user/consents\
\{\
"user_id": \cf4 \strokec4 "player_123"\cf0 \strokec2 ,\
"timestamp": \cf4 \strokec4 "2026-01-01T13:00:00Z"\cf0 \strokec2 ,\
"origin": \cf4 \strokec4 "casino.example.com"\cf0 \strokec2 \
\}\
Triggers Fast Track to fetch data from User Consents API.\

\f0\b\fs28 8.4 Player Blocks Update
\f1\b0\fs24 \
\pard\pardeftab720\partightenfactor0
\cf3 \strokec3 4\cf0 \strokec2 PUT /v2/integration/user/blocks\
\{\
"user_id": \cf4 \strokec4 "player_123"\cf0 \strokec2 ,\
"timestamp": \cf4 \strokec4 "2026-01-01T13:15:00Z"\cf0 \strokec2 ,\
"origin": \cf4 \strokec4 "casino.example.com"\cf0 \strokec2 \
\}\
\pard\pardeftab720\partightenfactor0

\f0\b\fs28 \cf0 8.5 User Updates
\f1\b0\fs24 \
PUT /v2/integration/user\
\{\
"user_id": \cf4 \strokec4 "player_123"\cf0 \strokec2 ,\
"timestamp": \cf4 \strokec4 "2026-01-01T14:00:00Z"\cf0 \strokec2 ,\
"origin": \cf4 \strokec4 "casino.example.com"\cf0 \strokec2 \
\}\

\f0\b\fs28 8.6 Payments
\f1\b0\fs24 \
POST /v2/integration/payments\
\{\
"user_id": \cf4 \strokec4 "player_123"\cf0 \strokec2 ,\
"payment_id": \cf4 \strokec4 "dep_001"\cf0 \strokec2 ,\
"payment_type": \cf4 \strokec4 "deposit"\cf0 \strokec2 ,\
"status": \cf4 \strokec4 "completed"\cf0 \strokec2 ,\
"amount": 100.0,\
"currency": \cf4 \strokec4 "EUR"\cf0 \strokec2 ,\
"timestamp": \cf4 \strokec4 "2026-01-01T12:45:00Z"\cf0 \strokec2 \
\}\

\f0\b\fs28 8.7 Casino Events
\f1\b0\fs24 \
POST /v2/integration/casino\
\pard\pardeftab720\partightenfactor0
\cf3 \strokec3 5\cf0 \strokec2 \{\
"user_id": \cf4 \strokec4 "player_123"\cf0 \strokec2 ,\
"game_id": \cf4 \strokec4 "slot_abc"\cf0 \strokec2 ,\
"bet": 10.0,\
"win": 20.0,\
"timestamp": \cf4 \strokec4 "2026-01-01T12:50:00Z"\cf0 \strokec2 \
\}\
\pard\pardeftab720\partightenfactor0

\f0\b\fs28 \cf0 8.8 Bonus Events
\f1\b0\fs24 \
POST /v2/integration/bonus\
\{\
"user_id": \cf4 \strokec4 "player_123"\cf0 \strokec2 ,\
"bonus_id": \cf4 \strokec4 "welcome_bonus_50"\cf0 \strokec2 ,\
"event_type": \cf4 \strokec4 "granted"\cf0 \strokec2 ,\
"timestamp": \cf4 \strokec4 "2026-01-01T13:30:00Z"\cf0 \strokec2 \
\}\

\f0\b\fs28 8.9 Balance Events
\f1\b0\fs24 \
POST /v2/integration/balances\
\{\
"user_id": \cf4 \strokec4 "player_123"\cf0 \strokec2 ,\
"balance": \{\
"cash": 90.0,\
"bonus": 20.0,\
"currency": \cf4 \strokec4 "EUR"\cf0 \strokec2 \
\},\
"timestamp": \cf4 \strokec4 "2026-01-01T12:55:00Z"\cf0 \strokec2 \
\}\
\pard\pardeftab720\partightenfactor0

\f0\b\fs36 \cf0 9. Event Delivery & Reliability
\f1\b0\fs24 \
\'e2\'80\'a2 Near real-time (<1s)\
\'e2\'80\'a2 Retry on non-200 responses\
\'e2\'80\'a2 Persist before delivery\
\'e2\'80\'a2 Ordered per user\
\pard\pardeftab720\partightenfactor0
\cf3 \strokec3 6
\f0\b\fs36 \cf0 \strokec2 10. Security
\f1\b0\fs24 \
\'e2\'80\'a2 Authenticate Operator APIs\
\'e2\'80\'a2 Authenticate Fast Track Integration API\
\'e2\'80\'a2 Sign provider wallet calls\
\pard\pardeftab720\partightenfactor0

\f0\b\fs36 \cf0 11. Certification & Validation Checklist
\f1\b0\fs24 \
\'e2\'80\'a2 Wallet math verified\
\'e2\'80\'a2 Idempotency tested\
\'e2\'80\'a2 Rollbacks tested\
\'e2\'80\'a2 Bonus lifecycle verified\
\'e2\'80\'a2 Fast Track timelines complete\
\pard\pardeftab720\partightenfactor0

\f0\b\fs48 \cf0 PoC Developer Guide \'e2\'80\'93 Fast Track + Mock
\f1\b0\fs24 \

\f0\b\fs48 iGaming Platform
\f1\b0\fs24 \
\pard\pardeftab720\partightenfactor0

\f0\b\fs36 \cf0 12. PoC Purpose
\f1\b0\fs24 \
Demonstrate Fast Track\'e2\'80\'93native integration with simulated components.\

\f0\b\fs36 13. PoC Architecture
\f1\b0\fs24 \
\'e2\'80\'a2 Simple Web Frontend\
\'e2\'80\'a2 Your iGaming Platform\
\'e2\'80\'a2 Mock Game Provider\
\'e2\'80\'a2 Fake PSP\
\'e2\'80\'a2 Fast Track (staging)\

\f0\b\fs36 14. PoC Demo Script
\f1\b0\fs24 \
1. Register player\
2. Login\
3. Deposit\
4. Grant bonus\
5. Play mock game\
6. Emit casino, balance, bonus events\

\f0\b\fs36 15. PoC Success Criteria
\f1\b0\fs24 \
\'e2\'80\'a2 Correct balances\
\pard\pardeftab720\partightenfactor0
\cf3 \strokec3 7\cf0 \strokec2 \'e2\'80\'a2 Complete CRM timelines\
\'e2\'80\'a2 Campaigns trigger successfully\
\pard\pardeftab720\partightenfactor0

\f0\b\fs36 \cf0 16. PoC \'e2\'86\'92 Production Gap
\f1\b0\fs24 \
Not covered: - Licensing - KYC / AML - Real PSPs - Real aggregators\
PoC validates 
\f0\b integration correctness
\f1\b0 , not regulatory compliance.\
\pard\pardeftab720\partightenfactor0
\cf3 \strokec3 8\cf0 \strokec2 \
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
\
}