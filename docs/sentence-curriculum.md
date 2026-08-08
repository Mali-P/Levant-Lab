# Sentence & phrase curriculum

The content side of [sentence-structures-plan.md](sentence-structures-plan.md).
That document is about machinery — frames, slots, agreement controllers,
perspectives. This one is about what a learner actually says, built as its own
curriculum rather than as sentences bolted onto the single-word decks.

Words and sentences are separate progressions that share a vocabulary. A learner
who knows `مي` / `מים` should meet *I want water* the same week, but she should
not have to finish a noun deck to get there.

## Three layers

1. **Core phrases** — fixed, whole, unanalysed. *I'm hungry. Where are you? I
   missed you.* These are cards, and they need nothing this app does not already
   have.
2. **Sentence patterns** — a frame with a slot. `I like ___`, `Do you want ___?`,
   `Where is the ___?`, `Can you ___?` These are `SentencePattern`s and they wait
   on Phases 1–2 of the plan.
3. **Natural exchanges** — 2–5 line conversations. *Do you want coffee? / Yes,
   please. / Do you want sugar? / No, thanks.* These are `Exchange`es — their own
   content type, ordered lines with a speaker each and a perspective derived per
   line — and they wait on Phase 7, which depends on nothing in the pattern
   model.

A phrase belongs in layer 1 until a second phrase shares its frame and the frame
is worth teaching. *I'm hungry* and *I'm thirsty* look like `I'm ___` and are
not: Hebrew and Arabic word them from unrelated stock. Layer 2 is earned by the
target languages, never by the English.

## Female-first, everywhere

Wherever a form varies, the female form is listed first, then the male —
matching the word cards and `SPEECH_PERSPECTIVES`. This holds in the seed, in
the editor, and in what a learner is shown by default. A male learner gets the
order flipped by `lead` (Phase 0), not by the content being rewritten.

## Axis discipline

The lists below tag varying phrases, and the tag is **not** a bare `♀/♂`. `♀/♂`
says *this varies*; it does not say *what decides it*, and the plan opens by
forbidding exactly that conflation:

| Tag | Meaning | Example |
| --- | --- | --- |
| `[sp]` | wording follows the **speaker** | *I'm tired* — עייפה / עייף |
| `[li]` | wording follows the **listener** | *Are you tired?* — hers or his |
| `[sp·li]` | both regions vary independently | *I'm happy to see you* |
| `[ref]` | follows a **third party** named in the sentence | *She is tired* |
| *(none)* | one wording serves everyone | *Where is the bank?* |

Two rules that follow, and that a `♀/♂`-only pass breaks:

- **Being said to someone is not `[li]`.** *Where is the bank?* is addressed to a
  person and worded identically whoever they are. Only mark `[li]` when the words
  change.
- **A tag is a claim about one language.** *I want ___* is `[sp]` in Hebrew
  (*rotsa / rotse*) and invariant in Arabic (`بدّي` serves both). The tags below
  are the **English-side candidates** — the axes worth checking — and the real
  answer is authored per language on the `LanguageSide`, then checked by a native
  speaker. A tag here is a question, not an authority.

Where a category is uniformly one axis, the axis is stated once at the top and
individual lines go untagged.

---

## Build order

Tiers, not chapters. A tier ships when its content has been checked; a learner
sees categories, not tiers.

| Tier | Categories | Why here |
| --- | --- | --- |
| **1 — say something today** | 1, 2, 4, 41 | Greetings, politeness, rescue phrases, fillers. The rescue deck is the one that lets a real conversation continue instead of ending. |
| **2 — be a person** | 3, 5, 6, 21, 22, 23 | Introducing yourself, learning the language, feelings, affection, family. |
| **3 — want and do** | 7, 8, 9, 10, 11, 24 | Likes, wants, ability, everyday actions, routine, question words. Densest source of layer-2 frames. |
| **4 — the day** | 12, 13, 14, 18, 19, 20, 35 | Food, home, location, time, plans, phone, weather. |
| **5 — out** | 15, 16, 17, 28, 29 | Directions, transport, walking, shopping, work. |
| **6 — care** | 30, 31, 32, 33, 34 | Caregiving, personal care, health, emergencies, safety. Small, high-stakes, needs the most careful check. |
| **7 — fluency** | 25, 26, 27, 36, 37, 38, 39, 40, 42 | Opinions, describing, people, past, future, invitations, permission, commands, exchanges. |

Tier 6 is late in *build* order and early in *importance*. It ships when it is
right, not when it is convenient — a wrong caregiving phrase is worse than a
missing one.

---

## 1. Greetings & basic conversation

Mixed. Greetings addressed to a person are `[li]`; statements about the speaker
are `[sp]`.

Hi. · Hello. · Hey. · Good morning. · Good afternoon. · Good evening. · Good
night. · Goodbye. · Bye. · See you. · See you later. · See you tomorrow. · See
you soon. · Have a good day. · Have a good evening. · Have a good night. · Have
a good weekend. · Welcome. · Welcome back.

- How are you? `[li]`
- How have you been? `[li]`
- How is everything?
- How's it going? `[li]`
- Are you okay? `[li]`
- I'm good. · I'm fine. · I'm okay. · I'm great. · Not bad. · I'm not okay. ·
  Everything is fine.
- I'm tired. `[sp]`
- It's good to see you. `[li]`
- Good to see you again. `[li]`
- Nice to meet you. `[li]`
- It was nice meeting you. `[li]`
- I'm happy to see you. `[sp·li]` — *happy* follows the speaker, *you* the listener
- I missed you. `[li]`
- I missed you a lot. `[li]`
- Did you miss me? `[li]`
- Come in. `[li]`
- Sit down. `[li]`
- Make yourself comfortable. `[li]`

> **Arabic note.** *I missed you* is `اشتقتلك` — the object is fused onto the
> verb as a suffix. Fine as a layer-1 card; explicitly out of scope as a layer-2
> frame (plan, Phase 1 constraints). Do not invent a `{slot}` for it.

## 2. Politeness & everyday social phrases

Mostly invariant; the imperatives are `[li]`.

Please. · Thank you. · Thanks. · Thanks a lot. · Thank you very much. · You're
welcome. · No problem. · It's okay. · That's okay. · Sorry. · I'm sorry. ·
Excuse me. · Forgive me. · It doesn't matter. · Of course. · Sure. · Definitely.
· Maybe. · Probably. · I think so. · I don't think so. · I hope so. · Me too. ·
Me neither. · Really? · Seriously? · Exactly. · That's right. · I understand. ·
I don't understand. · I agree. · I don't agree. · I was wrong. · Never mind. ·
Good luck. · Congratulations. · Well done. · Bless you.

- Don't worry. `[li]`
- Take your time. `[li]`
- Be careful. `[li]`
- Take care. `[li]`
- You're right. `[li]`

## 3. Learning Hebrew & Arabic

Statements about the learner are `[sp]`; questions are `[li]`.

- I am learning Hebrew. / Arabic. / Hebrew and Arabic. `[sp]`
- I'm trying to learn Hebrew. / Arabic. `[sp]`
- I want to learn Hebrew. / Arabic. `[sp]`
- I want to speak Hebrew / Arabic better. `[sp]`
- I want to practise Hebrew. / Arabic. `[sp]`
- I need more practice. `[sp]`
- I'm still learning. `[sp]`
- I'm a beginner. `[sp]`
- My Hebrew / Arabic isn't very good yet.
- I understand a little Hebrew. / Arabic. `[sp]`
- I speak a little Hebrew. / Arabic. `[sp]`
- I can read Hebrew. / Arabic. `[sp]`
- I can't read Hebrew / Arabic well. `[sp]`
- I can't read Arabic yet. `[sp]`
- I know that word. · I don't know that word. · I know this sentence.
- This word is new to me. · This is difficult. · This is easy. · Hebrew is
  difficult. · Arabic is difficult.
- I'm getting better. `[sp]`
- I'm learning slowly. `[sp]`
- I'm trying to remember. `[sp]`
- I forgot. · I remember now.

### Asking about language — all `[li]`

Do you speak Hebrew? / Arabic? / English? · Do you understand Hebrew? / Arabic? /
English? · Can you read Hebrew? / Arabic? · What languages do you speak? · Which
language do you prefer? · Can I practise with you? · Will you help me practise?

Invariant: Can we speak Hebrew? / Arabic? / English?

## 4. Language-learning rescue phrases

**A flagship deck.** These are what keep a conversation alive instead of ending
it, and a learner should meet them in her first week. Questions about the words
themselves are invariant; requests aimed at a person are `[li]`.

What does this mean? · What does that mean? · What does this word mean? · How do
you say this in Hebrew? / Arabic? / English? · How do I say ___? · What is this
called? · What is that called? · How do you pronounce this? / that? · Did I say
it correctly? · Is that correct? · Is this correct? · Is my pronunciation
correct? · I didn't understand. · I understood. · I understand now. · How is it
written? · How do you spell it? · Which word? · Which one? · This one? · That
one? · What did she say? `[ref]` · What did he say? `[ref]`

`[li]`: Can you correct me? · Please correct me if I'm wrong. · Can you repeat
that? · Say it again, please. · Can you say it again slowly? · Speak slowly,
please. · A little slower, please. · I didn't hear you. · Can you explain it? ·
Can you give me an example? · Can you write it down? · Can you type it for me? ·
What did you say?

> *How do you say ___ in Hebrew?* is the single highest-value layer-2 frame in
> the curriculum: one frame, every noun she owns.

## 5. Introducing yourself

- My name is ___. · I'm from ___. · I live in ___. · I live nearby. · I live far
  away. · I was born in ___. · I grew up in ___. · This is my first time here.
- I live alone. `[sp]`
- I live with my family. `[sp]`
- I'm thirty-one years old. `[sp]`
- I'm Australian. / Israeli. / from New Zealand. `[sp]`
- I'm a writer. `[sp]`
- I work from home. `[sp]`
- I'm studying. / learning. / working. `[sp]`
- I'm not working today. `[sp]`
- I've been here before. `[sp]`
- `[li]`: What's your name? · Where are you from? · Where do you live? · How old
  are you? · What do you do for work? · What did you do for work?

## 6. Getting to know someone

Almost entirely `[li]` — every one of these is a question put to a person.

Tell me about yourself. · What do you like to do? · What do you do for fun? ·
What kind of music do you like? · What movies do you like? · What TV shows do you
like? · Do you like reading? / cooking? / travelling? / animals? · Do you have
pets? / a cat? / a dog? · Where do you like to go? · What do you usually do on
weekends? · Are you busy today? · What are you doing today? / tomorrow? · What
did you do yesterday? · How was your day? · How was your weekend?

Invariant: What are your hobbies? · What's your favourite food? / colour? / song?

## 7. Likes & dislikes

`[sp]` throughout in languages that inflect the verb; a large layer-2 pattern
family — `I like ___` / `I don't like ___` over nouns and over infinitives, which
are **two frames**, not one, because the slot roles differ.

### Likes
I like it. · this. · that. · walking. · driving. · running. · swimming. ·
cooking. · baking. · reading. · writing. · drawing. · painting. · travelling. ·
shopping. · dancing. · singing. · listening to music. · watching movies. ·
watching TV. · going out. · staying home. · animals. · cats. · dogs. · coffee. ·
tea. · sweet food. · spicy food. · I really like it. · I love it.

- I like you. `[sp·li]`

### Dislikes
I don't like it. · this. · that. · walking. · driving. · running. · cooking. ·
shopping. · waiting. · crowds. · loud music. · spicy food. · getting up early. ·
I hate waiting. · traffic. · being late. · I don't mind. · It's not my
favourite. · I prefer this. · that. · coffee. · tea.

- Which do you prefer? `[li]`

## 8. Wants, needs & preferences

`[sp]` in Hebrew, invariant in Arabic — the canonical illustration of why axes
are per language. The plan's Phase 6 table already carries `I want ___` and
`I need ___`.

I want this. · that. · one. · two. · I don't want it. · this. · that. · I want to
go. · I don't want to go. · I want to stay. · to go home. · to eat. · to drink. ·
coffee. · water. · to sleep. · to rest. · to learn. · to understand. · to try. ·
to see. · to know. · to help. · I need this. · that. · help. · water. · food. ·
to rest. · to sleep. · to leave. · to go home. · a minute. · more time. · I don't
need it. · I'd rather stay home. · go tomorrow. · walk. · drive.

Two layer-2 frames each for want and need — a noun slot and an infinitive slot —
kept apart by `SlotRole`, which is what stops *I want to water*.

## 9. Ability & inability

Statements `[sp]`, questions `[li]`.

`[sp]`: I can do it. · I can't do it. · I can help. · I can't help. · I can
drive. · I can't drive. · I can walk. · I can't walk. · I can swim. · I can
cook. · I can read it. · I can understand it. · I can see it.

`[sp·li]`: I can hear you. · I can't hear you.

`[li]`: Can you do it? · Can you help me? · Can you drive? · Can you come? · Can
you wait? · Can you see it? · Can you hear me? · Can you reach it? · Can you open
it? · Can you close it?

`Can you ___?` is a layer-2 frame with an infinitive slot and a listener-agreeing
frame in both languages.

## 10. Everyday actions

`[sp]` throughout — present-tense participles inflect for the speaker in both
languages.

I'm walking. · driving. · eating. · drinking. · cooking. · cleaning. · working. ·
studying. · reading. · writing. · watching TV. · listening to music. · resting. ·
sleeping. · getting dressed. · getting ready. · leaving. · coming. · going home.
· waiting. · looking for something. · talking on the phone. · sending a message.
· taking a shower. · washing my hands. · brushing my teeth.

## 11. Daily routine

`[sp]`, except the two questions.

I wake up early. · late. · I get up at seven. · I make coffee in the morning. · I
eat breakfast. · I don't eat breakfast. · I take a shower. · I get dressed. · I
go to work. · I work from home. · I eat lunch. · I finish work at five. · I go
for a walk. · I make dinner. · I watch TV. · I read before bed. · I go to bed
late. · early. · I sleep well. · I didn't sleep well.

`[li]`: What time do you wake up? · What time do you go to bed?

## 12. Food & drink

`[li]`: Are you hungry? · Are you thirsty? · Do you want something to eat? /
drink? · Do you want coffee? / tea? / water? · Would you like more coffee? · Do
you want more? · What do you want to eat? / drink? · Have you eaten?

`[sp]`: I'm hungry. · I'm not hungry. · I'm thirsty. · I'm not thirsty. · I'd
like some coffee. / water. / something to eat. · I already ate. · I haven't eaten
yet. · I'm full. · I can't eat any more.

Invariant: What are we eating? · What are we having for dinner? · This is
delicious. · This is really good. · It tastes good. · It's too sweet. / salty. /
spicy. / hot. · It's cold. · Just a little. · A little more. · That's enough. ·
Enjoy your meal.

## 13. Home

`[li]`: Are you home? · When will you be home? · Turn on the light. · Turn off
the light. · Open the window. · Close the window. · Open the door. · Close the
door. · Lock the door. · Put it here. · Put it there. · Leave it there.

`[sp]`: I'm home. · I'm coming home. · I'm cleaning the house.

Invariant: Where is the kitchen? / bathroom? / bedroom? / light? · The door is
open. · The door is locked. · It's upstairs. · downstairs. · in the kitchen. · in
the bedroom. · on the table. · under the bed. · next to the chair. · The house is
clean. · The house is messy. · Where should I put this?

`Where is the ___?` — the plan's reference case for a **definite realisation with
no agreement axis at all**. Do not tag it `[li]` because it is asked of a person.

## 14. Location & finding things

`[li]`: Where are you? · Where did you put it? · Have you seen my phone? / my
keys?

`[sp]`: I'm here. · outside. · inside. · downstairs. · upstairs. · nearby. · far
away. · on my way. · almost there. · lost. · I'm looking for my phone.

Invariant: Where is it? / this? / that? · I can't find it. · I found it! · Look
what I found! · Here it is. · There it is. · It's here. · there. · over there. ·
Look here. `[li]` · Look over there. `[li]`

## 15. Directions

Invariant except the imperatives, which are `[li]`.

Where is ___? · How do I get there? · Is it far? · Is it nearby? · Is it within
walking distance? · Can I walk there? · Should I walk or drive? · It's on the
right. · on the left. · across the street. · next to the shop. · behind the
building. · in front of the building. · We're almost there. · We went the wrong
way. · This is the right way. · Which way? · Where should I turn?

`[li]`: Go straight. · Turn right. · Turn left. · Stop here. · Wait here. · Keep
going. · Can you show me?

## 16. Driving & transport

`[sp]`: I like driving. · I don't like driving. · I'm driving. · I parked
outside. · I'll pick you up. · I'll drive. · I'm waiting for the bus. · I missed
the bus. · I need a taxi.

`[li]`: Are you driving? · Can you drive? · Do you have a car? · Where did you
park? · Get in the car. · Get out of the car. · Put on your seatbelt. · Drive
carefully. · Slow down. · Stop here. · Can you drop me off here? · Can you pick
me up? · You can drive.

Invariant: The car is outside. · There's a lot of traffic. · The traffic is
terrible. · We're stuck in traffic. · The bus is late. · Which bus do I take? ·
Where is the bus stop? · When is the next bus? · How much is the fare? · How long
does it take?

## 17. Walking & going outside

`[sp]`: I like walking. · I don't like walking. · I'm going for a walk. · I walk
every day. · I walked here. · I'm tired.

`[li]`: Do you want to go for a walk? · Walk slowly. · Wait for me.

Invariant: Let's go for a walk. · It's too far to walk. · It's not far. · Let's
walk. · Let's drive. · My feet hurt. · Let's sit down. · Let's rest for a
minute. · It's nice outside. · hot outside. · cold outside. · It's raining. ·
Take an umbrella. `[li]` · The weather is beautiful.

## 18. Time

Almost entirely invariant — the tier-4 category that costs least and returns
most.

What time is it? · What time? · What time should I come? · What time should we
leave? · It's early. · It's late. · I'll be there at three. · I'll come
tomorrow. · later. · Not now. · Right now. · In a minute. · In five minutes. · In
an hour. · Soon. · Later. · Today. · Tomorrow. · Yesterday. · This morning. ·
This afternoon. · This evening. · Tonight. · Last night. · Next week. · Last
week. · Every day. · Sometimes. · Usually. · Always. · Never.

`[sp]`: I'm early. · I'm late.
`[li]`: What time are you coming? · You're early. · You're late. · Come at five.

## 19. Making plans

`[li]`: What are you doing today? / tomorrow? · Are you free today? / tomorrow? ·
Are you busy? · Do you want to meet? · to come with me? · to go out? · to get
coffee? · to eat together? · What time works for you? · Call me later. · Message
me when you're ready. · Tell me when you're coming.

Invariant: Let's go. · Let's stay here. · Let's meet tomorrow. · Let's meet at
five. · Where should we meet? · When should we meet? · Today works for me. ·
Tomorrow is better. · I can't today. · Maybe tomorrow. · I'm free after work. ·
I'll let you know.

## 20. Phone & messaging

`[li]`: Do you have a charger? · Can I use your charger? · Call me. · I'll call
you. · Call me when you get home. · Text me. · Send me a message. · I sent you a
message. · Did you see my message? · Did you get my message? · I didn't see your
message. · Why didn't you answer? · Send me the photo. · I'll send it to you. ·
Show me. · Look at this. · Watch this. · Can you hear me? · I'll call you back.

`[sp]`: Sorry, I was busy. · I'll reply later. · I can't hear you. `[sp·li]`

Invariant: Where is my phone? · My phone is dead. · My battery is low. · I need
to charge my phone. · My phone was on silent. · The connection is bad.

## 21. Feelings & mood

The clearest `[sp]` block in the curriculum, and the reference content for
`I am ___` with a **speaker-agreeing adjective in a slot** — plan Phase 6, the
row where the frame is invariant and the filler is not.

`[sp]`: I'm happy. · sad. · tired. · exhausted. · bored. · excited. · nervous. ·
worried. · scared. · angry. · annoyed. · confused. · surprised. · embarrassed. ·
relaxed. · stressed. · I feel better. · I feel good. · I feel terrible.

`[li]`: Are you happy? · sad? · tired? · angry? · worried? · What's wrong? · What
happened? · Why are you sad? · Don't be sad. · Don't worry.

Invariant: Everything will be okay.

## 22. Affection & close relationships

The densest `[li]` and `[sp·li]` block, and the reason the axis separation is
worth building. Tier 2 — a learner reaches for these long before she reaches for
shopping.

`[li]`: I love you. · I like you. · I miss you. · I missed you. · I missed you so
much. · Did you miss me? · I'm thinking about you. · Come here. · Give me a hug.
· You're sweet. · You're funny. · I trust you. · I believe you. · I care about
you. · Take care of yourself. · Sleep well.

`[sp·li]`: I'm happy to see you. · It's good to have you here. · I'm proud of
you. · I'm here for you. · I'm worried about you.

Listener-fixed by the English: You're beautiful. `♀` · You're handsome. `♂` —
these are two cards, not one card with a variant, because the English differs.

Invariant: Sweet dreams.

## 23. Family

Mostly invariant statements; the questions are `[li]`, and *your mother* carries
a listener-varying possessive.

This is my mother. / father. / sister. / brother. / daughter. / son. /
grandmother. / grandfather. / family. · My family lives nearby. / far away. · I'm
visiting my family. · We're going to my mother's house. · My sister is coming
tomorrow.

`[li]`: Do you have brothers? / sisters? / children? · How is your mother? /
father? / family?

## 24. Asking questions

The reusable question words, taught as structures. Questions put to a person are
`[li]`; questions about a thing are not.

Invariant: Who is that? · Who is this? · What is this? · What is that? · What
happened? · Why? · Why not? · How? · How much? · How many? · Which one?

`[li]`: Who are you? · What are you doing? · What do you want? · What do you
need? · What do you think? · Where are you? · Where are you going? · Where do you
live? · Where did you go? · When are you coming? · When did you arrive? · Why are
you laughing? · How did you do that? · Which one do you want?

## 25. Opinions

`[sp]` where the verb inflects; `[li]` where the sentence is about the listener.

I think so. · I don't think so. · I think it's good. · bad. · beautiful. ·
interesting. · funny. · strange. · I agree. · I disagree. · That makes sense. ·
That doesn't make sense. · I'm not sure. · I don't know. · It depends. · In my
opinion, it's better. · I prefer the other one.

`[li]`: I think you're right. · I think you're wrong. · What do you think? · Do
you agree? · Maybe you're right.

## 26. Describing things

Every one of these is `[ref]` — the adjective agrees with whatever *it* is, and
`{ kind: 'referent' }` is the controller that says so. Authored as the frame
`It's ___` over the adjective deck with the prompt's `referentGender` fixed,
rather than as thirty cards.

It's good. · bad. · nice. · beautiful. · ugly. · big. · small. · long. · short. ·
heavy. · light. · hot. · cold. · warm. · clean. · dirty. · new. · old. ·
expensive. · cheap. · easy. · difficult. · important. · interesting. · boring. ·
funny. · strange. · ready. · broken. · It works. · It doesn't work.

## 27. People & descriptions

`[ref]` in the third person, `[li]` in the second. The English carries the gender
in *she* / *he*, so this is **two frames** — `She is ___` and `He is ___`, each
with its own `referentGender` — over the same adjective deck, and the Hebrew and
Arabic adjective follows the referent in both.

She is nice. / He is nice. · funny. · kind. · tired. · busy. · hungry. · tall. ·
short. · young. · old. · She is my friend. / He is my friend. · She is beautiful.
/ He is handsome.

`[li]`: You're funny. · You're kind. · You're tired.

## 28. Shopping

Largely invariant, which makes it a cheap tier-5 win.

How much is this? / that? · How much does it cost? · That's expensive. · That's
cheap. · Do you have this? · another one? · a smaller one? · a bigger one? · I'm
just looking. `[sp]` · I want this one. · that one. · I don't want it. · I'll take
it. · I'll take two. · Can I pay by card? · in cash? · Do you have change? · I
need a bag. · I don't need a bag. · Where can I pay? · Can I try this on? · It's
too big. · too small. · It fits. · It doesn't fit.

`How much is the ___?` — definite realisation, no agreement. Plan Phase 6.

## 29. Work & study

`[sp]`: I'm working. · studying. · busy. · not busy. · I have work today. · I
don't work today. · I'm working tomorrow. · I work from home. · I need to finish
this. · I'm almost finished. · I finished. · I haven't finished yet. · I'll do it
later. · I'm taking a break. · I like my job. · I don't like my job.

`[li]`: Can you help me? · Show me how. · What do you do for work? · Where do you
work? · Do you like your job?

Invariant: I need help. · I have a question. · I don't know how to do this. ·
Let's take a break.

## 30. Caregiving & helping someone

**A first-class category, not an appendix.** Nearly every line is `[li]` because
nearly every line is spoken *to* the person being cared for, and this is the
category where getting the listener form wrong lands hardest.

`[li]`: How are you feeling? · Are you comfortable? · Are you in pain? · Do you
need anything? · Do you need help? · Can I help you? · Do you want water? /
coffee? · Are you hungry? · Do you want something to eat? · Do you need the
bathroom? · Do you want to sit up? / lie down? · Are you comfortable like this? ·
Lift your arm. · Move your leg. · Turn this way. · Turn the other way. · Hold
on. · Be careful. · Take your time. · Don't rush.

`[sp·li]`: I'm going to help you sit up. · to stand. · I'm going to move your
arm. / your leg.

Invariant: Is this better? · Is this okay? · Tell me if it hurts. `[li]` · Tell me
if you need anything. `[li]` · Slowly. · I'm here. · I'll be right back. · I'm not
going anywhere.

## 31. Washing, dressing & personal care

`[li]` throughout, with the same care as 30.

Do you want to take a shower? · to wash? · to brush your teeth? · Let me help
you. · Can you lift your arm? · Can you turn around? · Put your arm here. · Put
your foot here. · Which shirt do you want? · Do you want this one? · I'll help
you change.

Invariant: Is the water too hot? / too cold? / okay? · I'll get a towel. · Here's
your towel. `[li]` · Let's get dressed. · Let's change your clothes. `[li]` · Your
clothes are clean. / wet. `[li]`

## 32. Health & body

`[sp]`: I don't feel well. · I feel sick. · I feel better. · I feel dizzy. · I
feel weak. · I'm very tired. · I have a headache. · a fever. · a cough. · I can't
sleep. · I need a doctor.

Invariant: My head hurts. · My stomach hurts. · My back hurts. · My arm hurts. ·
My leg hurts. · My foot hurts. · My throat hurts. · It hurts here. · It doesn't
hurt. · It hurts a little. · a lot. · Does this hurt?

`[li]`: Do you need a doctor? · Do you take medicine? · Did you take your
medicine? · Breathe slowly. · Take a deep breath. · Are you feeling better?

## 33. Emergencies

Short, invariant where possible, and **checked hardest of anything in the
curriculum**. A learner reaching for these has no time to disambiguate a form.

Help! · I need help. · Call an ambulance. · Call the police. · Call a doctor. ·
It's an emergency. · Someone is hurt. · She is hurt. / He is hurt. `[ref]` · She
fell. / He fell. `[ref]` · I fell. `[sp]` · I can't breathe. · She can't breathe. /
He can't breathe. `[ref]` · I'm bleeding. · She is bleeding. / He is bleeding.
`[ref]` · Where are we? · What's the address? · We need help now.

`[li]`: Stay here. · Don't move. · Are you conscious? · Can you hear me?

## 34. Safety & warnings

`[li]`: Be careful. · Watch out. · Stop. · Wait. · Don't touch it. · Don't go
there. · Don't move. · Stay here. · Stay with me.

Invariant: It's dangerous. · It's safe. · Is it safe? · Lock the door. `[li]` ·
Close the window. `[li]` · Stay inside. `[li]` · Let's leave. · We need to go. ·
Everything is okay. · We're safe.

## 35. Weather

Invariant almost throughout — a good early category for that reason.

It's hot. · It's very hot. · It's cold. · warm. · cool. · sunny. · cloudy. ·
raining. · windy. · It's beautiful outside. · The weather is nice today. · The
weather is terrible. · Is it raining? · Is it cold outside? · Turn on the air
conditioner. `[li]` · Turn off the air conditioner. `[li]` · Open the window.
`[li]` · Close the window. `[li]`

`[sp]`: I'm too hot. · I'm freezing.
`[li]`: Take a jacket. · Take an umbrella.

## 36. Past tense conversation

Eventually its own grammar progression rather than a phrase list. Worth checking
early: first-person past does not inflect for the speaker in either language the
way the present participle does, so a good many of these are **invariant despite
feeling personal**. If that holds, say so in the deck note — it is a genuine
relief for a learner.

I went home. · to work. · for a walk. · I drove there. · I walked there. · I
ate. · I drank coffee. · I slept. · I worked. · I studied. · I saw her. / him.
`[ref]` · I spoke to her. / him. `[ref]` · I looked for it. · I found it. · I
forgot. · I remembered. · I didn't go. · I didn't see it. · I didn't understand. ·
I didn't know.

`[li]`: I called you. · I sent you a message. · I waited for you. · I didn't hear
you. · What did you do? · Where did you go? · Who did you see? · What did you
eat? · Did you sleep well?

## 37. Future tense conversation

`[sp]` where the verb inflects; `[li]` where the listener is named.

I'll go tomorrow. · I'll come tomorrow. · I'll do it. · I'll try. · I'll wait. ·
I'll see. · I'll ask. · I'll tell her. / him. · I'll bring it. · I'll get it. ·
I'll make coffee. · I'll cook. · I'll drive. · I'll walk. · I'll be there. · I'll
be back soon. · I won't be long. · I'll let you know.

`[li]`: I'll call you later. · I'll message you. · I'll help you. · I'll see you
tomorrow. · What will you do? · Are you coming tomorrow?

## 38. Invitations & suggestions

*Let's* is invariant (first person plural); the imperatives are `[li]`.

Let's go. · Let's eat. · Let's drink coffee. · Let's go outside. · Let's go for a
walk. · Let's drive. · Let's watch a movie. · Let's listen to music. · Let's stay
home. · Let's do it tomorrow. · Shall we go? · Shall we eat? · Maybe later. ·
Maybe tomorrow. · Not today. · Sounds good. · Good idea. · That's a good idea.

`[li]`: Come with me. · Sit with me. · Do you want to come? · Do you want to join
us?

## 39. Permission

Invariant in the usual phrasings — the speaker is asking about her own action.
Verify: phrased with *yechola / yachol* it becomes `[sp]`, which is a deck-level
authoring choice to make once and record, the same way the plan handles
*Can I ___?* / *efshar*.

Can I come in? · sit here? · use this? · take this? · open it? · close the
window? · help? · come tomorrow? · Is it okay if I stay? · if I leave? · Of
course. · Go ahead. · That's fine. · No, sorry. · Not now. · Maybe later.

`[li]`: Can I ask you something? · Can I call you? · Can I message you?

## 40. Instructions & commands

**Uniformly `[li]`.** Every imperative in Hebrew and Arabic takes the addressee's
gender, and this is the category where a single wrong form is heard as an insult
to the person spoken to. No line here ships without a check.

Come here. · Go there. · Sit down. · Stand up. · Wait. · Stop. · Listen. · Look.
· Look at me. · Look at this. · Give me that. · Take this. · Bring it here. · Put
it here. · Leave it there. · Open it. · Close it. · Try again. · Speak slowly. ·
Say it again. · Tell me. · Show me. · Help me. · Call me. · Follow me. · Wait for
me.

## 41. Conversation fillers

Small, invariant, and disproportionately responsible for sounding like a person
rather than a textbook. Tier 1 alongside the rescue phrases.

Okay. · Yeah. · Yes. · No. · Maybe. · Of course. · Sure. · Really? · Seriously? ·
Exactly. · Right. · I know. · I see. · I understand. · Well … · So … · Anyway … ·
Actually … · Basically … · Probably. · I guess. · I think so. · I suppose so. ·
Maybe not. · Why not? · What? · Huh? · Wait. · Hold on. · One second. · Just a
minute. · Let me think. · I don't know. · I'm not sure. · That's true. · That's
interesting. · That's funny. · That's weird. · No way!

## 42. Natural mini-conversations

Layer 3. Taught as whole exchanges, because the second line is what a learner
never practises and always needs.

**Greeting** — Hi, how are you? / I'm good. How are you? / I'm good too.

**Seeing someone again** — It's good to see you. / Good to see you too. / I
missed you. / I missed you too.

**Language** — Do you speak Arabic? / A little. I'm still learning. / Your Arabic
is good. / Thanks, but I need more practice.

**Coffee** — Do you want coffee? / Yes, please. / Do you want sugar? / No,
thanks.

**Plans** — What are you doing tomorrow? / I'm not sure yet. / Do you want to get
coffee? / Sure.

**Finding something** — Where's my phone? / I don't know. / Have you seen it? /
Yes, it's on the table.

**Care** — Are you comfortable? / Yes. / Do you need anything? / Can I have some
water? / Of course.

An exchange has a **speaker per line**, and the perspective alternates: if line 1
is ♀→♂, line 2 is ♂→♀. That is the whole reason layer 3 needs its own model
rather than a card with newlines in it.

---

## Layer-2 harvest

The frames this curriculum yields, over and above the plan's Phase 6 starter
table. Each is one frame against a filler deck the learner already owns.

| Frame | Slot role | Source | Notes |
| --- | --- | --- | --- |
| How do you say ___ in Hebrew/Arabic? | noun | §4 | Highest value in the set — one frame, every word she knows |
| I like ___ / I don't like ___ | noun | §7 | |
| I like ___ (doing) | infinitive | §7 | Separate frame; the role is what stops nonsense |
| Do you want ___? | noun | §12, §30 | `[li]` frame, already in Phase 6 |
| Can you ___? | infinitive | §9 | `[li]` frame |
| Can I ___? | infinitive | §39 | Phase 6; authoring choice on the phrasing |
| I'm going to help you ___ | infinitive | §30 | `[sp·li]` — **blocked**, two agreeing regions |
| Do you have ___? | noun | §23, §28 | |
| It's ___ | adjective | §26 | `[ref]` — slot agrees with the referent |
| She is ___ / He is ___ | adjective | §27 | `[ref]` — two frames, one per referent gender |
| My ___ hurts | noun (body) | §32 | |
| I'll ___ tomorrow | infinitive | §37 | |
| Let's ___ | infinitive | §38 | Invariant frame, cheap |
| Where is the ___? | place | §13, §15 | Definite realisation, no agreement |
| How much is the ___? | noun | §28 | Definite realisation |
| I am ___ | adjective | §21 | Slot agrees with speaker |
| This is ___ | noun | §23 | Slot-controlled frame |

## What this curriculum asked for, and what was decided

Four gaps surfaced by writing the content rather than the machinery. All four
are now settled in the plan; recorded here with their resolutions, because the
resolutions are what an author needs while writing a category.

1. **Third-person referent agreement (`[ref]`) — resolved: `referent` is a
   controller.** `AgreementController` gains `{ kind: 'referent' }`, and a
   prompt carries `referentGender`. §26 and §27 stop being sixty hand-written
   cards and become two frames over the adjective deck. Distinct from `slot`:
   `slot` names a replaceable position, `referent` names a person the content
   has already fixed. *She is ___* and *He is ___* stay two frames, because the
   English fixes the referent.
2. **Exchanges — resolved: their own content type.** `Exchange` holds ordered
   `ExchangeLine[]` plus a `participants` pair, and each line's perspective is
   **derived** from its speaker rather than stored, so a three-line greeting
   alternates ♀→♂, ♂→♀, ♀→♂ without an author writing that down. Two modes:
   read-through, and taking a part. Plan Phase 7, which depends on nothing in
   the pattern model and can ship early.
3. **Two agreeing regions — resolved as a boundary, not a feature.** The plan's
   third principle now says it outright: when replacing a slot changes
   morphology outside the slot, or two independently controlled regions are
   needed, author a whole card. §30's *I'm going to help you sit up* is a card,
   and so is *I'm happy to see you* wherever both regions inflect. The frame
   engine stays a substitution engine instead of becoming a grammar compiler.
4. **Fused objects in Arabic — resolved: confirmed exclusion.** §1 and §22's
   *I missed you* (`اشتقتلك`) is authored as a whole card with a note. *I missed
   ___* is the standing example of an English phrase that looks like a trivial
   frame and is not, which is why the boundary rule is decided per language.

**The `[ref]` rows in the [harvest](#layer-2-harvest) are unblocked by 1;
`I'm going to help you ___` stays blocked by 3, permanently and on purpose.**

### The tags are metadata, not a generator

Restating the axis-discipline rule in its final form, because it is the one most
likely to be shortcut by a script: `[sp]`, `[li]`, `[sp·li]` and `[ref]` describe
the **English source**. They may drive a lint — *"this side has a `forms` pair
and its English is tagged `[li]`; has the agreement been reviewed?"* — and they
may never write `LanguageSide.agreement`. *I want coffee* is `[sp]` in English,
speaker-varying in Hebrew, and invariant in Arabic. Deriving the target-language
axis from the English tag is the plan's first principle violated one level
further out.

## Content-check discipline

Every axis tag in this document is a hypothesis. The plan says a wrong frame is
worse than a wrong card because it multiplies; the same holds for a wrong axis,
which multiplies across every learner who does not share the default identity.

- No phrase ships without a native check of both languages.
- Tier 6 (care, health, emergency) and category 40 (commands) get a second check,
  because a wrong listener form there is not a small error.
- Where a language makes one form serve everyone, author one form. Never
  fabricate a variant to fill a column.
- Where the two languages disagree on the axis, that is normal, and the note goes
  in the card.
