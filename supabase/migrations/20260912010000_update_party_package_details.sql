-- Update party package details to match the current leaflet
update public.site_content
set value = '6', updated_at = now()
where key = 'parties_base_children';

update public.site_content
set value = '15', updated_at = now()
where key = 'parties_additional_child_price';

update public.site_content
set value = 'Celebrate at The Slime Studio with 90 minutes of exclusive use of the studio. Every guest gets to choose their type of slime, add their own colour and scent, decorate it with charms and take their creation home. Your party also includes balloons and a birthday banner, slime bubble-making fun, and the option to bring your own birthday cake and party food.', updated_at = now()
where key = 'parties_hero_text';
