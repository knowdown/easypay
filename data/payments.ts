export const paymentTypes = [
  { id: "piti", title: "Monthly Piti", shortTitle: "Piti", description: "Monthly employee contribution", suggestedAmount: 1500, icon: "₹", color: "mint" },
  { id: "meals", title: "Team Meals", shortTitle: "Meals", description: "Cafeteria and team lunch payments", suggestedAmount: 450, icon: "☕", color: "sand" },
  { id: "events", title: "Office Events", shortTitle: "Events", description: "Celebrations, outings and activities", suggestedAmount: 800, icon: "✦", color: "lilac" },
  { id: "travel", title: "Travel Advance", shortTitle: "Travel", description: "Return unused travel advance", suggestedAmount: 2000, icon: "↗", color: "blue" },
  { id: "welfare", title: "Employee Welfare", shortTitle: "Welfare", description: "Voluntary welfare fund contribution", suggestedAmount: 500, icon: "♥", color: "mint" },
  { id: "other", title: "Other Payment", shortTitle: "Other", description: "Make another organisation payment", suggestedAmount: 1000, icon: "+", color: "sand" },
] as const;

export const paymentHistory = [
  { title: "Monthly Piti", date: "30 Jun 2026", amount: 1500, icon: "₹", reference: "EPY26063018" },
  { title: "Team Lunch", date: "18 Jun 2026", amount: 450, icon: "☕", reference: "EPY26061842" },
  { title: "Office Cricket Day", date: "04 Jun 2026", amount: 800, icon: "✦", reference: "EPY26060471" },
  { title: "Monthly Piti", date: "30 May 2026", amount: 1500, icon: "₹", reference: "EPY26053009" },
  { title: "Employee Welfare", date: "12 May 2026", amount: 500, icon: "♥", reference: "EPY26051256" },
  { title: "Monthly Piti", date: "30 Apr 2026", amount: 1500, icon: "₹", reference: "EPY26043023" },
] as const;
