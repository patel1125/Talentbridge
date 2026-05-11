'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { useCreateJob, useUpdateJob, useJob } from '@/hooks/useJobs';
import { Button, Input, Textarea, Select, Card, TagsInput, ListInput } from '@/components/ui';

const schema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']),
  category: z.string().min(1),
  'location.city': z.string().optional(),
  'location.state': z.string().optional(),
  'location.country': z.string().optional(),
  'location.remote': z.boolean().optional(),
  'location.hybrid': z.boolean().optional(),
  'salary.min': z.coerce.number().optional(),
  'salary.max': z.coerce.number().optional(),
  'salary.currency': z.string().default('USD'),
  'salary.period': z.enum(['hourly', 'monthly', 'yearly']).default('yearly'),
  'salary.disclosed': z.boolean().default(true),
  applicationDeadline: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const JOB_TYPE_OPTS = [
  { value: 'full-time', label: 'Full-time' }, { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' }, { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
];
const EXP_OPTS = [
  { value: 'entry', label: 'Entry Level' }, { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' }, { value: 'lead', label: 'Lead' },
  { value: 'executive', label: 'Executive' },
];
const CATEGORY_OPTS = [
  { value: 'Engineering', label: 'Engineering' }, { value: 'Design', label: 'Design' },
  { value: 'Marketing', label: 'Marketing' }, { value: 'Data Science', label: 'Data Science' },
  { value: 'Finance', label: 'Finance' }, { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Education', label: 'Education' }, { value: 'Sales', label: 'Sales' },
  { value: 'Operations', label: 'Operations' }, { value: 'HR', label: 'Human Resources' },
  { value: 'Legal', label: 'Legal' }, { value: 'Customer Support', label: 'Customer Support' },
];
const PERIOD_OPTS = [
  { value: 'yearly', label: 'Per year' }, { value: 'monthly', label: 'Per month' },
  { value: 'hourly', label: 'Per hour' },
];

interface JobFormProps {
  jobId?: string;
  isEdit?: boolean;
}

export function JobForm({ jobId, isEdit }: JobFormProps) {
  const router = useRouter();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const { data: existingJob } = useJob(jobId || '');

  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [niceToHave, setNiceToHave] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [isRemote, setIsRemote] = useState(false);
  const [isHybrid, setIsHybrid] = useState(false);
  const [salaryDisclosed, setSalaryDisclosed] = useState(true);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      jobType: 'full-time',
      experienceLevel: 'mid',
      category: 'Engineering',
      'salary.currency': 'USD',
      'salary.period': 'yearly',
      'salary.disclosed': true,
    },
  });

  useEffect(() => {
    if (existingJob && isEdit) {
      reset({
        title: existingJob.title,
        description: existingJob.description,
        jobType: existingJob.jobType,
        experienceLevel: existingJob.experienceLevel,
        category: existingJob.category,
        'location.city': existingJob.location?.city || '',
        'location.state': existingJob.location?.state || '',
        'location.country': existingJob.location?.country || 'US',
        'salary.min': existingJob.salary?.min,
        'salary.max': existingJob.salary?.max,
        'salary.currency': existingJob.salary?.currency || 'USD',
        'salary.period': existingJob.salary?.period || 'yearly',
        'salary.disclosed': existingJob.salary?.disclosed !== false,
      });
      setResponsibilities(existingJob.responsibilities || []);
      setQualifications(existingJob.qualifications || []);
      setNiceToHave(existingJob.niceToHave || []);
      setSkills(existingJob.skills || []);
      setIsRemote(existingJob.location?.remote || false);
      setIsHybrid(existingJob.location?.hybrid || false);
      setSalaryDisclosed(existingJob.salary?.disclosed !== false);
    }
  }, [existingJob, isEdit]);

  const onSubmit = async (data: FormData) => {
    if (responsibilities.length === 0) { alert('Add at least one responsibility.'); return; }
    if (qualifications.length === 0) { alert('Add at least one qualification.'); return; }

    const payload = {
      ...data,
      responsibilities,
      qualifications,
      niceToHave,
      skills,
      location: {
        city: data['location.city'],
        state: data['location.state'],
        country: data['location.country'] || 'US',
        remote: isRemote,
        hybrid: isHybrid,
      },
      salary: {
        min: data['salary.min'],
        max: data['salary.max'],
        currency: data['salary.currency'],
        period: data['salary.period'],
        disclosed: salaryDisclosed,
      },
    };

    if (isEdit && jobId) {
      await updateJob.mutateAsync({ id: jobId, data: payload });
      router.push(`/dashboard/recruiter/jobs/${jobId}`);
    } else {
      await createJob.mutateAsync(payload);
      router.push('/dashboard/recruiter/jobs');
    }
  };

  return (
    <div className="max-w-3xl animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? 'Edit' : 'Post a'} <span className="text-amber-400">Job</span>
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-100">Basic Information</h2>
          <Input label="Job Title" placeholder="e.g. Senior Frontend Engineer" error={errors.title?.message} {...register('title')} />
          <Textarea label="Job Description" placeholder="Describe the role, team, and impact…" className="min-h-[140px]" error={errors.description?.message} {...register('description')} />
          <div className="grid grid-cols-3 gap-3">
            <Select label="Job Type" options={JOB_TYPE_OPTS} {...register('jobType')} />
            <Select label="Experience Level" options={EXP_OPTS} {...register('experienceLevel')} />
            <Select label="Category" options={CATEGORY_OPTS} {...register('category')} />
          </div>
        </Card>

        {/* Location */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-gray-100">Location</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isRemote} onChange={e => setIsRemote(e.target.checked)} className="w-4 h-4 accent-amber-400" />
              <span className="text-sm text-gray-400">Remote</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isHybrid} onChange={e => setIsHybrid(e.target.checked)} className="w-4 h-4 accent-amber-400" />
              <span className="text-sm text-gray-400">Hybrid</span>
            </label>
          </div>
          {!isRemote && (
            <div className="grid grid-cols-3 gap-3">
              <Input label="City" placeholder="San Francisco" {...register('location.city')} />
              <Input label="State / Region" placeholder="CA" {...register('location.state')} />
              <Input label="Country" placeholder="US" {...register('location.country')} />
            </div>
          )}
        </Card>

        {/* Salary */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-100">Salary Range</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={salaryDisclosed} onChange={e => setSalaryDisclosed(e.target.checked)} className="w-4 h-4 accent-amber-400" />
              <span className="text-sm text-gray-400">Show salary</span>
            </label>
          </div>
          {salaryDisclosed && (
            <div className="grid grid-cols-3 gap-3">
              <Input label="Minimum" type="number" placeholder="60000" {...register('salary.min')} />
              <Input label="Maximum" type="number" placeholder="90000" {...register('salary.max')} />
              <Select label="Period" options={PERIOD_OPTS} {...register('salary.period')} />
            </div>
          )}
        </Card>

        {/* Responsibilities */}
        <Card className="p-6">
          <h2 className="font-semibold text-gray-100 mb-4">Responsibilities <span className="text-red-400">*</span></h2>
          <ListInput
            value={responsibilities}
            onChange={setResponsibilities}
            placeholder="Add a responsibility…"
          />
        </Card>

        {/* Qualifications */}
        <Card className="p-6">
          <h2 className="font-semibold text-gray-100 mb-4">Qualifications <span className="text-red-400">*</span></h2>
          <ListInput
            value={qualifications}
            onChange={setQualifications}
            placeholder="Add a qualification…"
          />
        </Card>

        {/* Nice to have */}
        <Card className="p-6">
          <h2 className="font-semibold text-gray-100 mb-4">Nice to Have</h2>
          <ListInput
            value={niceToHave}
            onChange={setNiceToHave}
            placeholder="Add a bonus qualification…"
          />
        </Card>

        {/* Skills */}
        <Card className="p-6">
          <h2 className="font-semibold text-gray-100 mb-4">Skills & Tags</h2>
          <TagsInput value={skills} onChange={setSkills} placeholder="Add a skill or technology…" />
        </Card>

        {/* Deadline */}
        <Card className="p-6">
          <Input label="Application Deadline (Optional)" type="date" {...register('applicationDeadline')} />
        </Card>

        <div className="flex gap-3 pb-8">
          <Button type="submit" size="lg" loading={createJob.isPending || updateJob.isPending} className="flex-1">
            {isEdit ? 'Update Job Listing' : 'Post Job Listing'}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
