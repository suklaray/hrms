ALTER TABLE `job_descriptions`
  ADD COLUMN `hiring_manager_id` VARCHAR(191) NULL;

UPDATE `job_descriptions` AS jd
LEFT JOIN `users` AS by_empid
  ON by_empid.`empid` = jd.`hiring_manager`
LEFT JOIN (
  SELECT `name`, MIN(`empid`) AS `empid`
  FROM `users`
  GROUP BY `name`
  HAVING COUNT(*) = 1
) AS by_name
  ON by_name.`name` = jd.`hiring_manager`
SET jd.`hiring_manager_id` = COALESCE(by_empid.`empid`, by_name.`empid`);

CREATE INDEX `job_descriptions_hiring_manager_id_idx`
  ON `job_descriptions`(`hiring_manager_id`);

ALTER TABLE `job_descriptions`
  ADD CONSTRAINT `job_descriptions_hiring_manager_id_fkey`
  FOREIGN KEY (`hiring_manager_id`) REFERENCES `users`(`empid`)
  ON DELETE SET NULL ON UPDATE CASCADE;
