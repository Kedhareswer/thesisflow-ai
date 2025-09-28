import greeting from '@/data/support/responses/greeting.json'
import pricing from '@/data/support/responses/pricing.json'
import tokens from '@/data/support/responses/tokens.json'
import about from '@/data/support/responses/about.json'
import changelog from '@/data/support/responses/changelog.json'
import contact from '@/data/support/responses/contact.json'
import navigation from '@/data/support/responses/navigation.json'
import account from '@/data/support/responses/account.json'
import features_explorer from '@/data/support/responses/features_explorer.json'
import features_planner from '@/data/support/responses/features_planner.json'
import features_writer from '@/data/support/responses/features_writer.json'
import features_extract from '@/data/support/responses/features_extract.json'
import ticket from '@/data/support/responses/ticket.json'
import feedback from '@/data/support/responses/feedback.json'
import unknown from '@/data/support/responses/unknown.json'

// Map of intent -> response file JSON (as imported modules)
export const supportResponsesMap: Record<string, any> = {
  greeting,
  pricing,
  tokens,
  about,
  changelog,
  contact,
  navigation,
  account,
  features_explorer,
  features_planner,
  features_writer,
  features_extract,
  ticket,
  feedback,
  unknown,
}
